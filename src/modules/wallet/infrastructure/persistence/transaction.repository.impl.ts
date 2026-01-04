import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WalletTransaction } from "src/modules/wallet/domain/entities/wallet-transaction.entity";
import { TransactionStatus } from "src/modules/wallet/domain/enums/transaction-status.enum";
import { TransactionRepository } from "src/modules/wallet/domain/repositories/transaction.repository";
import { Repository } from "typeorm";

// infrastructure/persistence/transaction.repository.impl.ts
@Injectable()
export class TransactionRepositoryImpl implements TransactionRepository {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly repo: Repository<WalletTransaction>,
  ) {}

  async create(data: Partial<WalletTransaction>) {
    return this.repo.save(this.repo.create(data));
  }

  async setReference(txId: string, referenceId: string) {
    await this.repo.update(txId, { referenceId });
  }

  async findPendingByReference(referenceId: string) {
    return this.repo.findOne({
      where: {
        referenceId,
        status: TransactionStatus.PENDING,
      },
    });
  }

  async success(txId: string, meta?: any) {
    await this.repo.update(txId, {
      status: TransactionStatus.SUCCESS,
      meta,
    });
  }

  async fail(txId: string) {
    await this.repo.update(txId, {
      status: TransactionStatus.FAILED,
    });
  }
}
