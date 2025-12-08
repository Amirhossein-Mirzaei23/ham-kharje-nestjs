import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';

@Unique(['user', 'friend'])
@Entity()
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  // user who sent the request
  @ManyToOne(() => User, (user) => user.sentFriendRequests, {
    onDelete: 'CASCADE',
  })
  user: User;

  // user who received the request
  @ManyToOne(() => User, (user) => user.receivedFriendRequests, {
    onDelete: 'CASCADE',
  })
  friend: User;

  @ManyToOne(() => Group, (group) => group.members, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  group?: Group;
  
  @Index()
  @Column({ default: false })
  isAccepted: boolean;
}
