import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bill } from './entities/bill.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Repository } from 'typeorm';
import { CreateBillDto } from './dto/bills.dto';
import { GroupMembership } from '../friendship/entities/groupMembership.entity';
import { WalletTransactionService } from '../wallet/application/services/wallet-transaction.service';
import { TransactionType } from '../wallet/domain/enums/transaction-type.enum';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(GroupMembership)
    private groupMembershipRepo: Repository<GroupMembership>,
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  async createBill(dto: CreateBillDto) {
    const creditor = await this.userRepo.findOneBy({ id: dto.creditorId });
    if (!creditor) throw new NotFoundException('Creditor not found');
    // No group, debtorId is required
    if (!dto.debtorId)
      throw new NotFoundException('Debtor id is required if no group');
    let group;
    if (dto.groupId) {
      group = await this.groupRepo.findOne({
        where: { id: dto.groupId },
      });
    }
    const debtor = await this.userRepo.findOne({
      where: { id: dto.debtorId },
    });
    if (!debtor) throw new NotFoundException('Debtor not found');
    if (!dto.title) throw new BadRequestException('عنوان بدهی را وارد کنید.');

    const bill = this.billRepo.create({
      creditor,
      debtor,
      group: group,
      title: dto.title,
      amount: dto.amount,
      paid: dto.paid ? dto.paid : 0,
      isPaid: dto.isPaid ? dto.isPaid : false,
      referenceId: dto.referenceId,
      totalAmount: dto.totalAmount,
    });
    const data = await this.billRepo.save(bill);

    return data;
  }
  async createGropuBill(dto: CreateBillDto) {
    const creditor = await this.userRepo.findOne({
      where: { id: dto.creditorId },
    });
    if (!creditor) throw new NotFoundException('Creditor not found');

    let group: Group | null = null;
    let bills: Array<Bill> = [];

    if (dto.groupId) {
      throw new NotFoundException('Group not found');
    }
    group = await this.groupRepo.findOne({
      where: { id: dto.groupId },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException('Group not found');
    if (!dto.title)
      throw new BadRequestException('برای بدهی عنوان انتخاب فرمایید.');
    // Get group members
    const memberships = await this.groupMembershipRepo.find({
      where: { group: { id: group.id } },
      relations: ['user'],
    });
    if (!memberships || memberships.length === 0)
      throw new NotFoundException('No members in group');

    // Divide amount equally
    const share = Number(dto.amount) / memberships.length;

    for (const membership of memberships) {
      // Skip creditor if they are also a member
      if (membership.user.id === creditor.id) continue;

      const debtor = await this.userRepo.findOne({
        where: { id: membership.user.id },
      });
      if (!debtor) continue;

      const bill = this.billRepo.create({
        creditor,
        debtor,
        title: dto.title,
        group,
        amount: share,
        paid: 0,
        isPaid: false,
      });
      bills.push(bill);
    }
    const data = this.billRepo.save(bills);
    return data;
  }
  async payBill(billId: number, amount: number, payerUserId: number) {
    const bill = await this.billRepo.findOne({
      where: { id: billId },
      relations: ['creditor', 'debtor'],
    });
    if (!bill) throw new NotFoundException('Bill not found');

    bill.paid += amount;
    if (bill.paid >= bill.amount) bill.isPaid = true;

    const updatedBill = await this.billRepo.save(bill);

    const transaction = await this.walletTransactionService.recordBillPayment(
      billId,
      amount,
      payerUserId,
      TransactionType.PAY_BILLS
    );

    return {
      bill: updatedBill,
      transaction,
    };
  }

  async listUserDebts(userId: number) {
    return this.billRepo.find({
      where: [{ debtor: { id: userId } }, { creditor: { id: userId } }],
      relations: ['creditor', 'debtor', 'group'],
    });
  }

  async deleteBill(referenceId:string) {
    const result = await this.billRepo.delete({referenceId:referenceId});
    if (!result.affected) {
      throw new NotFoundException('Bill not found');
    }

    return {
      message: 'Bill deleted successfully',
    };
  }
}
