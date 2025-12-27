import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';

@Entity()
export class GroupMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  group: Group;

  @ManyToOne(() => User, (user) => user.groupMemberships, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Bill, (bill) => bill, { onDelete: 'CASCADE' })
  bill: Bill;

  @CreateDateColumn()
  createdAt: Date;
}
