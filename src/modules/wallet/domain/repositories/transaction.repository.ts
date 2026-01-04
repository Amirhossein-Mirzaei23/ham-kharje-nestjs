import { WalletTransaction } from "../entities/wallet-transaction.entity";

// domain/repositories/transaction.repository.ts
export abstract class TransactionRepository {
  abstract create(data: Partial<WalletTransaction>): Promise<WalletTransaction>;
  abstract setReference(txId: string, referenceId: string): Promise<void>;
  abstract findPendingByReference(
    referenceId: string,
  ): Promise<WalletTransaction | null>;
  abstract success(txId: string, meta?: any): Promise<void>;
  abstract fail(txId: string): Promise<void>;
}
