import { Length } from 'class-validator';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Index } from 'typeorm';
import { Friendship } from '../../friendship/entities/friendship.entity';

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

}