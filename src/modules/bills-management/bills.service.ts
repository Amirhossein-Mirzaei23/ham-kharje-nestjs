import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Bill } from "./entities/bill.entity";
import { User } from "../users/entities/user.entity";
import { Group } from "../groups/entities/group.entity";
import { Repository } from "typeorm";
import { CreateBillDto } from "./dto/bills.dto";

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
  ) {}

  async createBill(dto: CreateBillDto) {
    const creditor = await this.userRepo.findOne({ where: { id: dto.creditorId } });
    const debtor = await this.userRepo.findOne({ where: { id: dto.debtorId } });
    const group = dto.groupId ? await this.groupRepo.findOne({ where: { id: dto.groupId } }) : null;

    if (!creditor || !debtor) throw new NotFoundException('User not found');

    const bill = this.billRepo.create({
      creditor,
      debtor,
      group:group ?? undefined,
      amount: dto.amount,
      paid: 0,
      isPaid: false,  
    });
    return this.billRepo.save(bill);
  }

  async payBill(billId: number, amount: number) {
    const bill = await this.billRepo.findOne({ where: { id: billId } });
    if (!bill) throw new NotFoundException('Bill not found');

    bill.paid += amount;
    if (bill.paid >= bill.amount) bill.isPaid = true;

    return this.billRepo.save(bill);
  }

  async listUserDebts(userId: number) {
    return this.billRepo.find({
      where: [
        { debtor: { id: userId } },
        { creditor: { id: userId } },
      ],
      relations: ['creditor', 'debtor', 'group'],
    });
  }
}
