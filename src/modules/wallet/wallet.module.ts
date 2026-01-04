import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Wallet } from "./domain/entities/wallet.entity";
import { WalletTransaction } from "./domain/entities/wallet-transaction.entity";
import { PaymentController } from "./presentation/payment.controller";
import { WalletController } from "./presentation/wallet.controller";
import { ChargeWalletUseCase } from "./application/use-cases/charge-wallet.usecase";
import { VerifyPaymentUseCase } from "./application/use-cases/verify-payment.usecase";
import { TransactionRepository } from "./domain/repositories/transaction.repository";
import { WalletRepositoryImpl } from "./infrastructure/persistence/wallet.repository.impl";
import { TransactionRepositoryImpl } from "./infrastructure/persistence/transaction.repository.impl";
import { WalletRepository } from "./domain/repositories/wallet.repository";
import { PaymentFactory } from "./infrastructure/payment/payment.factory";
import { ZarinpalService } from "./infrastructure/payment/zarinpal.service";
import { IdpayService } from "./infrastructure/payment/idpay.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
  ],
  controllers: [WalletController, PaymentController],
  providers: [
    // UseCases
    ChargeWalletUseCase,
    VerifyPaymentUseCase,

    // Repositories
    { provide: WalletRepository, useClass: WalletRepositoryImpl },
    { provide: TransactionRepository, useClass: TransactionRepositoryImpl },

    // Payment
    PaymentFactory,
    ZarinpalService,
    IdpayService,
  ],
})
export class WalletModule {}
