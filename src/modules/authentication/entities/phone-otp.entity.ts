import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('phone_otps')
export class PhoneOtp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  phone: string;

  @Column()
  codeHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: 0 })
  sendCount: number;

  @Column({ type: 'timestamp' })
  lastSentAt: Date;

  @Column({ type: 'inet', nullable: true })
  lastIpAddress: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  registerAllowedUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
