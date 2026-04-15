import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from '../bills-management/entities/bill.entity';
import { User } from '../users/entities/user.entity';
import { WalletTransactionService } from './application/services/wallet-transaction.service';
import { Wallet } from './domain/entities/wallet.entity';
import { WalletTransaction } from './domain/entities/wallet-transaction.entity';
import { TransactionRepository } from './domain/repositories/transaction.repository';
import { WalletRepository } from './domain/repositories/wallet.repository';
import { TransactionRepositoryImpl } from './infrastructure/persistence/transaction.repository.impl';
import { WalletRepositoryImpl } from './infrastructure/persistence/wallet.repository.impl';
import { VandarService } from './infrastructure/vandar.service';
import { TransactionController } from './presentation/transaction.controller';
import { WalletController } from './presentation/wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, User, Bill])],
  controllers: [WalletController, TransactionController],
  providers: [
    WalletService,
    WalletTransactionService,
    VandarService,
    WalletRepositoryImpl,
    { provide: WalletRepository, useClass: WalletRepositoryImpl },
    { provide: TransactionRepository, useClass: TransactionRepositoryImpl },
  ],
  exports: [WalletService, WalletTransactionService, WalletRepositoryImpl],
})
export class WalletModule {}
