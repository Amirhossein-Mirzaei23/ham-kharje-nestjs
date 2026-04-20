import { Group } from 'src/modules/groups/entities/group.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

@Entity()
@Index(['groupId'])
@Index(['inviterId'])
@Index(['used', 'expiresAt'])
export class Invite {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string;

  @Column({ nullable: true})
  groupId: number;

  @Column()
  inviterId: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @ManyToOne(() => Group, { onDelete: 'CASCADE',nullable:true })
  group?: Group;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  inviter: User;

  @BeforeInsert()
  setDefaultExpiration() {
    if (!this.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      this.expiresAt = expiresAt;
    }
  }
}
