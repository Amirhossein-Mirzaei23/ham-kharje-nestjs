import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Bill } from '../bills-management/entities/bill.entity';
import { User } from '../users/entities/user.entity';
import { ChargeWalletDto } from './dto/charge-wallet.dto';
import { VandarPaymentCallbackDto } from './dto/vandar-payment-callback.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { PayBillDto } from './application/dto/pay-bill.dto';
import { Wallet } from './domain/entities/wallet.entity';
import { WalletTransaction } from './domain/entities/wallet-transaction.entity';
import { TransactionStatus } from './domain/enums/transaction-status.enum';
import { TransactionType } from './domain/enums/transaction-type.enum';
import { InsufficientBalanceException } from './exceptions/insufficient-balance.exception';
import { WalletNotFoundException } from './exceptions/wallet-not-found.exception';
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
    const callbackUrl = this.normalizeCallbackUrl(dto.callbackUrl);

    const payment = await this.vandarService.createPaymentToken({
      amount: dto.amount,
      callbackUrl,
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
          callbackUrl,
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

  async payBill(billId: number, payerUserId: number, dto: PayBillDto) {
    await this.ensureUserExists(payerUserId);

    const prepared = await this.dataSource.transaction(async (manager) => {
      const bill = await this.findBillForUpdate(manager, billId);
      this.ensureBillCanBePaidByUser(bill, payerUserId);
      this.ensureBillPaymentAmount(bill, dto.amount);

      const [payerWallet, creditorWallet] = await this.findWalletPairForUpdate(
        manager,
        payerUserId,
        bill.creditor.id,
      );
      const transactionRepository = manager.getRepository(WalletTransaction);

      if (payerWallet.balance >= dto.amount) {
        payerWallet.balance -= dto.amount;
        creditorWallet.balance += dto.amount;
        this.applyBillPayment(bill, dto.amount);

        await manager.save(Wallet, [payerWallet, creditorWallet]);
        await manager.save(Bill, bill);

        const referenceId = randomUUID();
        const debit = transactionRepository.create({
          walletId: payerWallet.id,
          paidByUserId: payerUserId,
          paidToUserId: bill.creditor.id,
          billId: bill.id,
          amount: dto.amount,
          gateway: null,
          referenceId,
          type: TransactionType.DEBIT,
          status: TransactionStatus.SUCCESS,
          meta: {
            source: 'bill_payment_wallet',
            creditorWalletId: creditorWallet.id,
            billTitle: bill.title,
          },
        });

        const credit = transactionRepository.create({
          walletId: creditorWallet.id,
          paidByUserId: payerUserId,
          paidToUserId: bill.creditor.id,
          billId: bill.id,
          amount: dto.amount,
          gateway: null,
          referenceId,
          type: TransactionType.CREDIT,
          status: TransactionStatus.SUCCESS,
          meta: {
            source: 'bill_payment_wallet',
            payerWalletId: payerWallet.id,
            billTitle: bill.title,
          },
        });

        await transactionRepository.save([debit, credit]);

        return {
          mode: 'WALLET' as const,
          bill,
          payerWallet,
          creditorWallet,
          referenceId,
          debit,
          credit,
        };
      }

      const pendingReference = randomUUID();
      const pendingTransaction = transactionRepository.create({
        walletId: payerWallet.id,
        paidByUserId: payerUserId,
        paidToUserId: bill.creditor.id,
        billId: bill.id,
        amount: dto.amount,
        gateway: 'VANDAR',
        referenceId: pendingReference,
        type: TransactionType.PAY_BILLS,
        status: TransactionStatus.PENDING,
        meta: {
          source: 'bill_payment_gateway',
          pendingReference,
          callbackUrl: this.buildWalletCallbackUrl(),
          billTitle: bill.title,
          debtorId: bill.debtor.id,
          creditorId: bill.creditor.id,
          requestedByUserId: payerUserId,
          gatewayRequest: null,
        },
      });

      await transactionRepository.save(pendingTransaction);

      return {
        mode: 'GATEWAY' as const,
        bill,
        payerWallet,
        pendingTransaction,
      };
    });

    if (prepared.mode === 'WALLET') {
      return {
        success: true,
        paymentMode: 'WALLET_BALANCE',
        status: 'SUCCESS',
        bill: this.buildBillPaymentSnapshot(prepared.bill),
        wallet: {
          payerBalance: prepared.payerWallet.balance,
          creditorBalance: prepared.creditorWallet.balance,
        },
        transactions: {
          referenceId: prepared.referenceId,
          debitTransactionId: prepared.debit.id,
          creditTransactionId: prepared.credit.id,
        },
      };
    }

    try {
      const callbackUrl = this.buildWalletCallbackUrl();
      const payment = await this.vandarService.createPaymentToken({
        amount: dto.amount,
        callbackUrl,
        mobileNumber: dto.mobileNumber,
        factorNumber: dto.factorNumber ?? prepared.pendingTransaction.id,
        description: dto.description ?? `Bill payment for #${prepared.bill.id}`,
        validCardNumbers: dto.validCardNumbers,
        comment: dto.comment,
      });

      prepared.pendingTransaction.referenceId = payment.token;
      prepared.pendingTransaction.meta = {
        ...(prepared.pendingTransaction.meta ?? {}),
        callbackUrl,
        factorNumber: dto.factorNumber ?? prepared.pendingTransaction.id,
        paymentToken: payment.token,
        paymentRequest: payment.raw,
      };

      await this.transactionRepository.save(prepared.pendingTransaction);

      return {
        success: true,
        paymentMode: 'VANDAR_GATEWAY',
        status: prepared.pendingTransaction.status,
        bill: this.buildBillPaymentSnapshot(prepared.bill),
        wallet: {
          payerBalance: prepared.payerWallet.balance,
          shortfall: Math.max(0, dto.amount - prepared.payerWallet.balance),
        },
        gateway: {
          transactionId: prepared.pendingTransaction.id,
          paymentToken: payment.token,
          paymentUrl: payment.paymentUrl,
        },
      };
    } catch (error) {
      prepared.pendingTransaction.status = TransactionStatus.FAILED;
      prepared.pendingTransaction.meta = {
        ...(prepared.pendingTransaction.meta ?? {}),
        gatewayError: this.serializeError(error),
      };
      await this.transactionRepository.save(prepared.pendingTransaction);
      throw error;
    }
  }

  async handlePaymentCallback(dto: VandarPaymentCallbackDto) {
    if (dto.payment_status !== 'OK') {
      return this.failGatewayTransaction(dto);
    }

    const verification = await this.vandarService.verifyPayment(dto.token);

    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.getRepository(WalletTransaction).findOne({
        where: { referenceId: dto.token },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction was not found');
      }

      if (transaction.status === TransactionStatus.SUCCESS) {
        return {
          success: true,
          paymentMode:
            transaction.type === TransactionType.PAY_BILLS
              ? 'VANDAR_GATEWAY'
              : 'WALLET_TOP_UP',
          transactionId: transaction.id,
          status: transaction.status,
          alreadyProcessed: true,
        };
      }

      if (transaction.type === TransactionType.CHARGE_WALLET) {
        return this.finalizeWalletChargeCallback(
          manager,
          transaction,
          dto,
          verification,
        );
      }

      if (transaction.type === TransactionType.PAY_BILLS) {
        return this.finalizeBillGatewayCallback(
          manager,
          transaction,
          dto,
          verification,
        );
      }

      throw new BadRequestException('Unsupported callback transaction type');
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

  private async failGatewayTransaction(dto: VandarPaymentCallbackDto) {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.getRepository(WalletTransaction).findOne({
        where: { referenceId: dto.token },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction was not found');
      }

      if (transaction.status === TransactionStatus.SUCCESS) {
        return {
          success: true,
          transactionId: transaction.id,
          status: transaction.status,
          alreadyProcessed: true,
        };
      }

      transaction.status = TransactionStatus.FAILED;
      transaction.meta = {
        ...(transaction.meta ?? {}),
        callback: dto,
      };
      await manager.save(WalletTransaction, transaction);

      return {
        success: false,
        paymentMode:
          transaction.type === TransactionType.PAY_BILLS
            ? 'VANDAR_GATEWAY'
            : 'WALLET_TOP_UP',
        transactionId: transaction.id,
        status: transaction.status,
        verified: false,
      };
    });
  }

  private async finalizeWalletChargeCallback(
    manager: EntityManager,
    transaction: WalletTransaction,
    dto: VandarPaymentCallbackDto,
    verification: Record<string, unknown>,
  ) {
    if (!transaction.walletId) {
      throw new WalletNotFoundException();
    }

    const wallet = await manager.getRepository(Wallet).findOne({
      where: { id: transaction.walletId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      throw new WalletNotFoundException();
    }

    wallet.balance += transaction.amount;
    await manager.save(Wallet, wallet);

    transaction.status = TransactionStatus.SUCCESS;
    transaction.meta = {
      ...(transaction.meta ?? {}),
      callback: dto,
      verification,
    };
    await manager.save(WalletTransaction, transaction);

    return {
      success: true,
      paymentMode: 'WALLET_TOP_UP',
      transactionId: transaction.id,
      status: transaction.status,
      verified: true,
      amount: transaction.amount,
      wallet: {
        walletId: wallet.id,
        balance: wallet.balance,
      },
    };
  }

  private async finalizeBillGatewayCallback(
    manager: EntityManager,
    transaction: WalletTransaction,
    dto: VandarPaymentCallbackDto,
    verification: Record<string, unknown>,
  ) {
    if (!transaction.billId || !transaction.paidToUserId) {
      throw new BadRequestException('Bill payment transaction is incomplete');
    }

    const bill = await this.findBillForUpdate(manager, transaction.billId);
    this.ensureBillPaymentAmount(bill, transaction.amount);

    const creditorWallet = await this.findWalletForUpdateByUserId(
      manager,
      transaction.paidToUserId,
    );

    creditorWallet.balance += transaction.amount;
    this.applyBillPayment(bill, transaction.amount);

    const creditTransaction = manager.getRepository(WalletTransaction).create({
      walletId: creditorWallet.id,
      paidByUserId: transaction.paidByUserId,
      paidToUserId: transaction.paidToUserId,
      billId: transaction.billId,
      amount: transaction.amount,
      gateway: 'VANDAR',
      referenceId: transaction.referenceId,
      type: TransactionType.CREDIT,
      status: TransactionStatus.SUCCESS,
      meta: {
        source: 'bill_payment_gateway_credit',
        sourceTransactionId: transaction.id,
        verification,
      },
    });

    await manager.save(Wallet, creditorWallet);
    await manager.save(Bill, bill);
    await manager.save(WalletTransaction, creditTransaction);

    transaction.status = TransactionStatus.SUCCESS;
    transaction.meta = {
      ...(transaction.meta ?? {}),
      callback: dto,
      verification,
      creditTransactionId: creditTransaction.id,
    };
    await manager.save(WalletTransaction, transaction);

    return {
      success: true,
      paymentMode: 'VANDAR_GATEWAY',
      transactionId: transaction.id,
      status: transaction.status,
      verified: true,
      bill: this.buildBillPaymentSnapshot(bill),
      wallet: {
        creditorWalletId: creditorWallet.id,
        creditorBalance: creditorWallet.balance,
      },
      transactions: {
        pendingTransactionId: transaction.id,
        creditTransactionId: creditTransaction.id,
      },
    };
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

  private ensureBillCanBePaidByUser(bill: Bill, payerUserId: number): void {
    if (bill.debtor.id !== payerUserId) {
      throw new BadRequestException('Only the bill debtor can pay this bill');
    }
  }

  private ensureBillPaymentAmount(bill: Bill, amount: number): void {
    const remainingAmount = Math.max(0, bill.amount - bill.paid);

    if (bill.isPaid || remainingAmount <= 0) {
      throw new BadRequestException('Bill is already fully paid');
    }

    if (amount > remainingAmount) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance of ${remainingAmount}`,
      );
    }
  }

  private applyBillPayment(bill: Bill, amount: number): void {
    bill.paid += amount;
    bill.isPaid = bill.paid >= bill.amount;
  }

  private buildBillPaymentSnapshot(bill: Bill) {
    return {
      id: bill.id,
      title: bill.title,
      amount: bill.amount,
      paid: bill.paid,
      remainingAmount: Math.max(0, bill.amount - bill.paid),
      isPaid: bill.isPaid,
      creditorId: bill.creditor?.id,
      debtorId: bill.debtor?.id,
    };
  }

  private async findBillForUpdate(
    manager: EntityManager,
    billId: number,
  ): Promise<Bill> {
    const bill = await manager
      .getRepository(Bill)
      .createQueryBuilder('bill')
      .innerJoinAndSelect('bill.creditor', 'creditor')
      .innerJoinAndSelect('bill.debtor', 'debtor')
      .where('bill.id = :billId', { billId })
      .setLock('pessimistic_write')
      .getOne();

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    return bill;
  }

  private async findWalletPairForUpdate(
    manager: EntityManager,
    firstUserId: number,
    secondUserId: number,
  ): Promise<[Wallet, Wallet]> {
    if (firstUserId === secondUserId) {
      const wallet = await this.findWalletForUpdateByUserId(manager, firstUserId);
      return [wallet, wallet];
    }

    const [smallUserId, largeUserId] = [firstUserId, secondUserId].sort(
      (left, right) => left - right,
    );
    const firstWallet = await this.findWalletForUpdateByUserId(manager, smallUserId);
    const secondWallet = await this.findWalletForUpdateByUserId(manager, largeUserId);

    return firstWallet.userId === firstUserId
      ? [firstWallet, secondWallet]
      : [secondWallet, firstWallet];
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

  private buildWalletCallbackUrl(): string {
    const baseUrl = process.env.Site_BASE_URL;
    if (!baseUrl) {
      throw new InternalServerErrorException('Site_BASE_URL is not configured');
    }

    const normalizedBase = this.normalizeCallbackUrl(baseUrl);
    return new URL('/wallet/callback', normalizedBase).toString();
  }

  private normalizeCallbackUrl(callbackUrl: string): string {
    const trimmed = callbackUrl.trim();
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')
        ? `http://${trimmed}`
        : `https://${trimmed}`;

    try {
      return new URL(normalized).toString();
    } catch {
      throw new BadRequestException('callbackUrl is invalid');
    }
  }

  private serializeError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return { message: 'Unknown gateway error' };
  }
}
