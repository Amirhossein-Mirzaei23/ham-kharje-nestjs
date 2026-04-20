import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMembership } from '../friendship/entities/groupMembership.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { Invite } from './entities/invite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, GroupMembership, Group, User]),
  ],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
