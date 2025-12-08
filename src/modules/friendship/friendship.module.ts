import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { Bill } from '../bills-management/entities/bill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, User, Bill])],
  providers: [FriendshipService],
  controllers: [FriendshipController],
})
export class FriendshipModule {}
