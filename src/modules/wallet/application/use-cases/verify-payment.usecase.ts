import { DataSource } from 'typeorm';
import { TransactionRepository } from '../../domain/repositories/transaction.repository';
import { PaymentFactory } from '../../infrastructure/payment/payment.factory';
import { Injectable } from '@nestjs/common';
import { TransactionStatus } from '../../domain/enums/transaction-status.enum';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletTransaction } from '../../domain/entities/wallet-transaction.entity';

@Injectable()
export class VerifyPaymentUseCase {
  constructor(
    // private walletRepo: WalletRepository,
    private txRepo: TransactionRepository,
    private paymentFactory: PaymentFactory,
    private dataSource: DataSource,
  ) {}

  async execute(authority: string, status: string) {
    const tx = await this.txRepo.findPendingByReference(authority);

    // Idempotency: اگر قبلاً پردازش شده
    if (!tx) return;

    if (status !== 'OK') {
      await this.txRepo.fail(tx.id);
      return;
    }

    if (!tx.gateway) {
      await this.txRepo.fail(tx.id);
      return;
    }

    const payment = this.paymentFactory.get(tx.gateway);

    const verified = await payment.verify(authority, tx.amount);
    if (!verified) {
      await this.txRepo.fail(tx.id);
      return;
    }

    // 🔒 Transaction + Lock
    await this.dataSource.transaction(async (manager) => {
      await manager.increment(
        Wallet,
        { id: tx.walletId },
        'balance',
        tx.amount,
      );

      await manager.update(
        WalletTransaction,
        { id: tx.id },
        {
          status: TransactionStatus.SUCCESS,
          meta: verified,
        },
      );
    });
  }
}
