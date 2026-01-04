import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TransactionType } from "../enums/transaction-type.enum";
import { TransactionStatus } from "../enums/transaction-status.enum";

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: number;

  @Column({ type: 'bigint' })
  amount: number;

  @Column()
  gateway: string;

  @Column()
  referenceId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'json', nullable: true })
  meta: any;

  @CreateDateColumn()
  createdAt: Date;
}
