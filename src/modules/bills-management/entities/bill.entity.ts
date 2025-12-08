import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value),
};

@Entity()
@Index(['creditor'])
@Index(['debtor'])
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  creditor: User;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  debtor: User;

  @ManyToOne(() => Group, (group) => group.bills, { nullable: true, onDelete: 'SET NULL' })
  group?: Group;

  @Column('decimal', { precision: 10, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  paid: number;

  @Column({ default: false })
  isPaid: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
