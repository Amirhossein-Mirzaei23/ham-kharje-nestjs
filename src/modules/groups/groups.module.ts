// groups.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { User } from 'src/modules/users/entities/user.entity';
import { Friendship } from 'src/modules/friendship/entities/friendship.entity';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';
import { GroupMembership } from '../friendship/entities/groupMembership.entity';
import { BillModule } from '../bills-management/bills.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMembership, User, Friendship, Bill]),
    BillModule
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
