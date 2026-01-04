import { Column, Entity, PrimaryGeneratedColumn, VersionColumn } from "typeorm";

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @VersionColumn()
  version: number;
}
