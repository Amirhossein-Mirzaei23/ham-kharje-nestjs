import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletTransaction } from '../../domain/entities/wallet-transaction.entity';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { TransactionType } from '../../domain/enums/transaction-type.enum';
import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { CreateWalletTransactionDto } from '../dto/create-wallet-transaction.dto';

@Injectable()
export class WalletTransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bill)
    private readonly billRepository: Repository<Bill>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async createTransaction(
    dto: CreateWalletTransactionDto,
  ): Promise<WalletTransaction> {
    await this.ensureUserExists(dto.paidByUserId, 'Payer user not found');

    if (dto.paidToUserId) {
      await this.ensureUserExists(dto.paidToUserId, 'Receiver user not found');
    }

    if (dto.walletId) {
      await this.ensureWalletExists(dto.walletId);
    }

    if (dto.billId) {
      await this.ensureBillExists(dto.billId);
    }

    const type = this.resolveTransactionType(dto);

    const transactionData = this.transactionRepository.create({
      walletId: dto.walletId ?? null,
      paidByUserId: dto.paidByUserId,
      paidToUserId: dto.paidToUserId ?? null,
      billId: dto.billId ?? null,
      amount: dto.amount,
      gateway: dto.gateway ?? null,
      referenceId: dto.referenceId ?? null,
      meta: dto.meta ?? null,
      type,
      status: TransactionStatus.SUCCESS,
    });

    return transactionData;
  }

  async getUserHistory(userId: number): Promise<WalletTransaction[]> {
    await this.ensureUserExists(userId, 'User not found');
    return this.transactionRepository.findUserHistory(userId);
  }

  async getTransactionById(txId: string): Promise<WalletTransaction> {
    const transaction = await this.transactionRepository.findById(txId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async recordBillPayment(
    billId: number,
    amount: number,
    payerUserId: number,
  ): Promise<WalletTransaction> {
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ['creditor', 'debtor'],
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.debtor.id !== payerUserId && bill.creditor.id !== payerUserId) {
      throw new BadRequestException('Payer is not related to this bill');
    }

    const wallet = await this.walletRepository.findOne({
      where: { userId: payerUserId },
    });

    return this.createTransaction({
      walletId: wallet?.id,
      paidByUserId: payerUserId,
      paidToUserId: bill.creditor.id,
      billId: bill.id,
      amount,
      type: bill.id ? TransactionType.PAY_BILLS: TransactionType.CHARGE_WALLET ,
      meta: {
        billTitle: bill.title,
        debtorId: bill.debtor.id,
        creditorId: bill.creditor.id,
      },
    });
  }

  private resolveTransactionType(
    dto: CreateWalletTransactionDto,
  ): TransactionType {
    if (dto.type) {
      return dto.type;
    }

    if (dto.billId) {
      return dto.paidByUserId === dto.paidToUserId
        ? TransactionType.CHARGE_WALLET
        : TransactionType.PAY_BILLS;
    }

    return TransactionType.CHARGE_WALLET;
  }

  private async ensureUserExists(
    userId: number,
    message: string,
  ): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(message);
    }
  }

  private async ensureBillExists(billId: number): Promise<void> {
    const bill = await this.billRepository.findOneBy({ id: billId });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
  }

  private async ensureWalletExists(walletId: number): Promise<void> {
    const wallet = await this.walletRepository.findOneBy({ id: walletId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
  }
}
