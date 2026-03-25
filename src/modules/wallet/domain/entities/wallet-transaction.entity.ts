import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { Wallet } from './wallet.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', nullable: true })
  walletId: number | null;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet | null;

  @Column({ type: 'integer' })
  paidByUserId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paidByUserId' })
  paidByUser: User;

  @Column({ type: 'integer', nullable: true })
  paidToUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paidToUserId' })
  paidToUser: User | null;

  @Column({ type: 'integer', nullable: true })
  billId: number | null;

  @ManyToOne(() => Bill, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'billId' })
  bill: Bill | null;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  gateway: string | null;

  @Column({ type: 'varchar', nullable: true })
  referenceId: string | null;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'json', nullable: true })
  meta: any;

  @CreateDateColumn()
  createdAt: Date;
}
