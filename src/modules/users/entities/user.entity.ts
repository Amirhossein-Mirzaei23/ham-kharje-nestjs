import { Length } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Index } from 'typeorm';
import { Friendship } from '../../friendship/entities/friendship.entity';
import { GroupMembership } from 'src/modules/friendship/entities/groupMembership.entity';
import { Group } from 'src/modules/groups/entities/group.entity';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';
import { PushSubscriptionDto } from 'src/push/dto/subscribe.dto';

@Index('idx_users_friends', { synchronize: false })
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Length(2, 50)
  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  email?: string;
  
  @Column({ nullable: true})
  image: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ select: true }) 
  password: string;

  @Column({ default: false,select: false })
  isVerified: boolean;

  @Column({ nullable: true,select: false })
  verificationCode: string;

  @Column({ 
  type: 'int',
  array: true,  
  default: [],
 })
  friends: number[];

@OneToMany(() => Friendship, (f) => f.user)
sentFriendRequests: Friendship[];

@OneToMany(() => Friendship, (f) => f.friend)
receivedFriendRequests: Friendship[];

@OneToMany(() => GroupMembership, m => m.user)
groupMemberships: GroupMembership[];

@OneToMany(() => Group, group => group.owner)
ownedGroups: Group[];


@OneToMany(() => Bill, (bill) => bill.creditor)
creditorBills: Bill[];

@OneToMany(() => Bill, (bill) => bill.debtor)
debtorBills: Bill[];

@Column({
  type: 'json',
  nullable: true,
})
subscription: PushSubscriptionDto | null;

@Length(24, 26)
@Column({ nullable: true, unique: true })
shebaNumber: string;

@Length(16, 19)
@Column({ nullable: true, unique: true })
cardNumber: string;
}