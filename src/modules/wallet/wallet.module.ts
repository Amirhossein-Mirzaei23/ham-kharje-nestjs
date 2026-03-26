import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from '../bills-management/entities/bill.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from './domain/entities/wallet.entity';
import { WalletTransaction } from './domain/entities/wallet-transaction.entity';
import { PaymentController } from './presentation/payment.controller';
import { TransactionController } from './presentation/transaction.controller';
import { WalletController } from './presentation/wallet.controller';
import { ChargeWalletUseCase } from './application/use-cases/charge-wallet.usecase';
import { VerifyPaymentUseCase } from './application/use-cases/verify-payment.usecase';
import { WalletTransactionService } from './application/services/wallet-transaction.service';
import { TransactionRepository } from './domain/repositories/transaction.repository';
import { WalletRepositoryImpl } from './infrastructure/persistence/wallet.repository.impl';
import { TransactionRepositoryImpl } from './infrastructure/persistence/transaction.repository.impl';
import { WalletRepository } from './domain/repositories/wallet.repository';
import { PaymentFactory } from './infrastructure/payment/payment.factory';
import { ZarinpalService } from './infrastructure/payment/zarinpal.service';
import { IdpayService } from './infrastructure/payment/idpay.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, User, Bill])],
  controllers: [WalletController, PaymentController, TransactionController],
  providers: [
    // UseCases
    ChargeWalletUseCase,
    VerifyPaymentUseCase,
    WalletTransactionService,
    WalletRepositoryImpl,
    // Repositories
    { provide: WalletRepository, useClass: WalletRepositoryImpl },
    { provide: TransactionRepository, useClass: TransactionRepositoryImpl },

    // Payment
    PaymentFactory,
    ZarinpalService,
    IdpayService,
  ],
  exports: [WalletTransactionService, WalletRepositoryImpl],
})
export class WalletModule {}
