import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ChargeWalletDto } from './dto/charge-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { VandarPaymentCallbackDto } from './dto/vandar-payment-callback.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
import { InsufficientBalanceException } from './exceptions/insufficient-balance.exception';
import { Wallet } from './domain/entities/wallet.entity';
import { WalletTransaction } from './domain/entities/wallet-transaction.entity';
import { TransactionStatus } from './domain/enums/transaction-status.enum';
import { TransactionType } from './domain/enums/transaction-type.enum';
import { VandarService } from './infrastructure/vandar.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly vandarService: VandarService,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getWalletByUserId(userId: number): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      throw new WalletNotFoundException(userId);
    }

    return wallet;
  }

  async getWalletHistory(userId: number): Promise<WalletTransaction[]> {
    await this.ensureUserExists(userId);

    return this.transactionRepository.find({
      where: [{ paidByUserId: userId }, { paidToUserId: userId }],
      relations: ['wallet', 'paidByUser', 'paidToUser', 'bill'],
      order: { createdAt: 'DESC' },
    });
  }

  async chargeWallet(userId: number, dto: ChargeWalletDto) {
    const wallet = await this.getWalletByUserId(userId);

    const payment = await this.vandarService.createPaymentToken({
      amount: dto.amount,
      callbackUrl: dto.callbackUrl,
      mobileNumber: dto.mobileNumber,
      factorNumber: dto.factorNumber,
      description: dto.description ?? 'Wallet top-up',
      validCardNumbers: dto.validCardNumbers,
      comment: dto.comment,
    });

    const transaction = await this.transactionRepository.save(
      this.transactionRepository.create({
        walletId: wallet.id,
        paidByUserId: userId,
        paidToUserId: null,
        billId: null,
        amount: dto.amount,
        gateway: 'VANDAR',
        referenceId: payment.token,
        type: TransactionType.CHARGE_WALLET,
        status: TransactionStatus.PENDING,
        meta: {
          callbackUrl: dto.callbackUrl,
          factorNumber: dto.factorNumber ?? null,
          paymentToken: payment.token,
          paymentRequest: payment.raw,
        },
      }),
    );

    return {
      transactionId: transaction.id,
      status: transaction.status,
      paymentToken: payment.token,
      paymentUrl: payment.paymentUrl,
    };
  }

  async handlePaymentCallback(dto: VandarPaymentCallbackDto) {
    return this.dataSource.transaction(async (manager) => {
      const transactionRepository = manager.getRepository(WalletTransaction);
      const walletRepository = manager.getRepository(Wallet);

      const transaction = await transactionRepository.findOne({
        where: {
          referenceId: dto.token,
          type: TransactionType.CHARGE_WALLET,
        },
        relations: ['wallet'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Charge transaction was not found');
      }

      if (transaction.status === TransactionStatus.SUCCESS) {
        return {
          transactionId: transaction.id,
          status: transaction.status,
          alreadyProcessed: true,
        };
      }

      if (dto.payment_status !== 'OK') {
        transaction.status = TransactionStatus.FAILED;
        transaction.meta = {
          ...(transaction.meta ?? {}),
          callback: dto,
        };
        await transactionRepository.save(transaction);

        return {
          transactionId: transaction.id,
          status: transaction.status,
          verified: false,
        };
      }

      const verification = await this.vandarService.verifyPayment(dto.token);

      if (!transaction.walletId) {
        throw new WalletNotFoundException();
      }

      await walletRepository.increment({ id: transaction.walletId }, 'balance', transaction.amount);

      transaction.status = TransactionStatus.SUCCESS;
      transaction.meta = {
        ...(transaction.meta ?? {}),
        callback: dto,
        verification,
      };

      await transactionRepository.save(transaction);

      return {
        transactionId: transaction.id,
        status: transaction.status,
        verified: true,
        amount: transaction.amount,
      };
    });
  }

  async transferWalletToWallet(senderUserId: number, dto: TransferWalletDto) {
    if (senderUserId === dto.recipientUserId) {
      throw new BadRequestException('Sender and recipient cannot be the same user');
    }

    await this.ensureUserExists(senderUserId);
    await this.ensureUserExists(dto.recipientUserId);

    return this.dataSource.transaction(async (manager) => {
      const [firstUserId, secondUserId] = [senderUserId, dto.recipientUserId].sort(
        (left, right) => left - right,
      );
      const firstWallet = await this.findWalletForUpdateByUserId(manager, firstUserId);
      const secondWallet = await this.findWalletForUpdateByUserId(manager, secondUserId);
      const senderWallet =
        firstWallet.userId === senderUserId ? firstWallet : secondWallet;
      const recipientWallet =
        firstWallet.userId === dto.recipientUserId ? firstWallet : secondWallet;

      this.ensureSufficientBalance(senderWallet.balance, dto.amount);

      senderWallet.balance -= dto.amount;
      recipientWallet.balance += dto.amount;

      await manager.save(Wallet, [senderWallet, recipientWallet]);

      const transferReference = randomUUID();
      const transactionRepository = manager.getRepository(WalletTransaction);

      const debit = transactionRepository.create({
        walletId: senderWallet.id,
        paidByUserId: senderUserId,
        paidToUserId: dto.recipientUserId,
        billId: null,
        amount: dto.amount,
        gateway: null,
        referenceId: transferReference,
        type: TransactionType.DEBIT,
        status: TransactionStatus.SUCCESS,
        meta: {
          direction: 'wallet_to_wallet',
          counterpartyWalletId: recipientWallet.id,
        },
      });

      const credit = transactionRepository.create({
        walletId: recipientWallet.id,
        paidByUserId: senderUserId,
        paidToUserId: dto.recipientUserId,
        billId: null,
        amount: dto.amount,
        gateway: null,
        referenceId: transferReference,
        type: TransactionType.CREDIT,
        status: TransactionStatus.SUCCESS,
        meta: {
          direction: 'wallet_to_wallet',
          counterpartyWalletId: senderWallet.id,
        },
      });

      await transactionRepository.save([debit, credit]);

      return {
        referenceId: transferReference,
        amount: dto.amount,
        senderBalance: senderWallet.balance,
        recipientBalance: recipientWallet.balance,
        debitTransactionId: debit.id,
        creditTransactionId: credit.id,
      };
    });
  }

  async withdrawToBank(userId: number, dto: WithdrawWalletDto) {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const wallet = await this.findWalletForUpdateByUserId(manager, userId);
      const iban = dto.iban ?? user.shebaNumber;

      if (!iban) {
        throw new BadRequestException('No IBAN was provided for payout');
      }

      this.ensureSufficientBalance(wallet.balance, dto.amount);

      wallet.balance -= dto.amount;
      await manager.save(Wallet, wallet);

      const payoutReference = randomUUID();
      const transactionRepository = manager.getRepository(WalletTransaction);
      const payoutTransaction = transactionRepository.create({
        walletId: wallet.id,
        paidByUserId: userId,
        paidToUserId: null,
        billId: null,
        amount: dto.amount,
        gateway: 'VANDAR_SETTLEMENT',
        referenceId: payoutReference,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.WITHDRAW_PENDING,
        meta: {
          iban,
          reason: dto.reason ?? null,
        },
      });

      await transactionRepository.save(payoutTransaction);

      try {
        const settlement = await this.vandarService.createSettlement(
          dto.amount,
          iban,
          payoutReference,
          {
            description: dto.reason ?? `Wallet payout for user ${userId}`,
            name: user.name,
          },
        );

        payoutTransaction.meta = {
          ...(payoutTransaction.meta ?? {}),
          settlement,
        };
        await transactionRepository.save(payoutTransaction);
      } catch (error) {
        throw error;
      }

      return {
        transactionId: payoutTransaction.id,
        referenceId: payoutReference,
        status: payoutTransaction.status,
        amount: dto.amount,
        iban,
        balance: wallet.balance,
      };
    });
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }
  }

  private ensureSufficientBalance(balance: number, amount: number): void {
    if (balance < amount) {
      throw new InsufficientBalanceException();
    }
  }

  private async findWalletForUpdateByUserId(
    manager: EntityManager,
    userId: number,
  ): Promise<Wallet> {
    const wallet = await manager.getRepository(Wallet).findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      throw new WalletNotFoundException(userId);
    }

    return wallet;
  }
}
