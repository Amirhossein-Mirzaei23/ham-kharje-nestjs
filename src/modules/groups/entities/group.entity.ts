import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Bill } from '../../bills-management/entities/bill.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Friendship } from 'src/modules/friendship/entities/friendship.entity';
import { GroupMembership } from 'src/modules/friendship/entities/groupMembership.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true})
  image: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  owner?: User;

  @OneToMany(() => Bill, (bill) => bill.group)
  bills: Bill[];

  @OneToMany(() => GroupMembership, gm => gm.group)
  members: GroupMembership[];
}
