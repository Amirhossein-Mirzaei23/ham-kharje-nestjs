import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { IsString } from 'class-validator';

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

  @Column({ default: 'Untitled Bill'})
  @IsString()
  title: string;

  @ManyToOne(() => User ,(user) => user.creditorBills, { nullable: false, onDelete: 'CASCADE' })
  creditor: User;

  @ManyToOne(() => User,(user) => user.debtorBills , { nullable: false, onDelete: 'CASCADE' })
  debtor: User;

  @ManyToOne(() => Group, (group) => group.bills, { nullable: true, onDelete: 'SET NULL' })
  group?: Group;

  @Column('decimal', { precision: 10, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  paid: number;

  @Column({ default: false })
  isPaid: boolean;


  @Column({ nullable: true  })
  referenceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
