import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMembership } from '../friendship/entities/groupMembership.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { PayBillDto } from '../wallet/application/dto/pay-bill.dto';
import { WalletService } from '../wallet/wallet.service';
import { CreateBillDto } from './dto/bills.dto';
import { Bill } from './entities/bill.entity';
import { DeleteBillDto } from '../wallet/application/dto/delete-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(GroupMembership)
    private groupMembershipRepo: Repository<GroupMembership>,
    private readonly walletService: WalletService,
  ) {}

  async createBill(dto: CreateBillDto) {
    const creditor = await this.userRepo.findOneBy({ id: dto.creditorId });
    if (!creditor) throw new NotFoundException('Creditor not found');
    if (!dto.debtorId) {
      throw new NotFoundException('Debtor id is required if no group');
    }

    let group: Group | null = null;
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
      group: group ?? undefined,
      title: dto.title,
      amount: dto.amount,
      paid: dto.paid ? dto.paid : 0,
      isPaid: dto.isPaid ? dto.isPaid : false,
      referenceId: dto.referenceId,
      totalAmount: dto.totalAmount,
    });

    return this.billRepo.save(bill);
  }

  async createGropuBill(dto: CreateBillDto) {
    const creditor = await this.userRepo.findOne({
      where: { id: dto.creditorId },
    });
    if (!creditor) throw new NotFoundException('Creditor not found');

    let group: Group | null = null;
    const bills: Bill[] = [];

    if (!dto.groupId) {
      throw new NotFoundException('Group not found');
    }

    group = await this.groupRepo.findOne({
      where: { id: dto.groupId },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException('Group not found');
    if (!dto.title) {
      throw new BadRequestException('برای بدهی عنوان انتخاب فرمایید.');
    }

    const memberships = await this.groupMembershipRepo.find({
      where: { group: { id: group.id } },
      relations: ['user'],
    });
    if (!memberships || memberships.length === 0) {
      throw new NotFoundException('No members in group');
    }

    const share = Number(dto.amount) / memberships.length;

    for (const membership of memberships) {
      if (membership.user.id === creditor.id) continue;

      const debtor = await this.userRepo.findOne({
        where: { id: membership.user.id },
      });
      if (!debtor) continue;

      bills.push(
        this.billRepo.create({
          creditor,
          debtor,
          title: dto.title,
          group,
          amount: share,
          paid: 0,
          isPaid: false,
        }),
      );
    }

    return this.billRepo.save(bills);
  }

  async payBill(billId: number, payerUserId: number, dto: PayBillDto) {
    return this.walletService.payBill(billId, payerUserId, dto);
  }

  async listUserDebts(userId: number) {
    return this.billRepo.find({
      where: [{ debtor: { id: userId } }, { creditor: { id: userId } }],
      relations: ['creditor', 'debtor', 'group'],
    });
  }

async deleteBill(payload: DeleteBillDto) {
  const bill = await this.billRepo.findOne({
    where: { referenceId: payload.referenceId },
    relations: ['creditor'],
  });

  if (!bill) {
    throw new NotFoundException('تراکنش یافت نشد');
  }

  if (bill.creditor.id !== payload.userId) {
    throw new BadRequestException('فقط ایجاد کننده تراکنش میتواند این تراکنش را حذف کند.');
  }

  const result = await this.billRepo.delete({referenceId:payload.referenceId});
    if (!result.affected) {
      throw new NotFoundException('Bill not found');
    }
  return {
    message: 'تراکنش با موفقیت حذف شد',
    data:result
  };
}

}
