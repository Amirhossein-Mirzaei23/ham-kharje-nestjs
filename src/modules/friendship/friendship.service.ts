import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { CreateFriendDto } from './dto/create-friend.dto';
import {
  AcceptFriendRequestDto,
  SendFriendRequestDto,
  UpdateFriendDto,
} from './dto/update-friend.dto';
import { Bill } from '../bills-management/entities/bill.entity';

@Injectable()
export class FriendshipService {
constructor(
  @InjectRepository(Friendship)
  private friendshipRepo: Repository<Friendship>,

  @InjectRepository(Bill)
  private billRepo: Repository<Bill>,

  @InjectRepository(User)
  private userRepo: Repository<User>,
) {}

  async sendFriendRequest(dto: SendFriendRequestDto) {
    const { senderId, receiverId } = dto;

    if (senderId === receiverId)
      throw new BadRequestException("شما نمیتوانید به خودتان درخواست بدهید.");

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    const receiver = await this.userRepo.findOne({ where: { id: receiverId } });

    if (!sender || !receiver) throw new NotFoundException('کاربر مد نظر یافت نشد');

    // check existing
    const existing = await this.friendshipRepo.findOne({
      where: { user: { id: senderId }, friend: { id: receiverId } },
    });

    if (existing) throw new BadRequestException('درخواست قبلا ارسال شده است.');

    const friendship = this.friendshipRepo.create({
      user: sender,
      friend: receiver,
    });

    return this.friendshipRepo.save(friendship);
  }

  async acceptRequest(dto: AcceptFriendRequestDto) {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: dto.friendshipId },
    });

    if (!friendship) throw new NotFoundException('درخواست یافت نشد');
    if (friendship.isAccepted)
      throw new BadRequestException('شما قبلا این درخواست را تایید کرده اید');

    friendship.isAccepted = true;
    return this.friendshipRepo.save(friendship);
  }
  async deleteRequest(friendshipId: number) {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
    });
    if (!friendship) throw new NotFoundException('درخواست یافت نشد');

    return this.friendshipRepo.remove(friendship);
  }

  async removeFriend(userId: number, friendId: number) {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        { user: { id: userId }, friend: { id: friendId } },
        { user: { id: friendId }, friend: { id: userId } },
      ],
    });
    if (!friendship) throw new NotFoundException('Friendship not found');

    return this.friendshipRepo.remove(friendship);
  }

async listFriends(
  userId: number,
  options: { page: number; limit: number }
) {
  const { page, limit } = options;

  // Get all friendships
  const [friendships, totalCount] = await this.friendshipRepo.findAndCount({
    where: [
      // { user: { id: userId }, isAccepted: true },
      { friend: { id: userId }, isAccepted: true },
    ],
    skip: (page - 1) * 100,
    take: limit,
    relations: ['user', 'friend'],
  });

  const friends = friendships.map((fs) =>
    fs.user.id === userId ? fs.friend : fs.user
  );

  // ------- Debt Calculation For Each Friend -------
  const results:Array<any> = [];

  for (const friendInfo of friends) {
    const friendId = friendInfo.id;
    
    const debtRows = await this.billRepo
      .createQueryBuilder('bill')
      .select([
        `SUM(CASE WHEN bill.creditorId = :friendId AND bill.debtorId = :userId THEN bill.amount - bill.paid ELSE 0 END) AS youOwe`,
        `SUM(CASE WHEN bill.creditorId = :userId AND bill.debtorId = :friendId THEN bill.amount - bill.paid ELSE 0 END) AS owesYou`,
      ])
      .setParameters({ userId, friendId })
      .getRawOne();

    const youOwe = parseFloat(debtRows.youOwe) || 0;
    const owesYou = parseFloat(debtRows.owesYou) || 0;
    
    results.push({
      friendInfo,
      youOwe,
      owesYou,
      net: owesYou - youOwe, // positive → they owe you
    });
  }

  return {
    total: totalCount,
    data: results,
  };
}


  async pendingRequests(userId: number) {
    return this.friendshipRepo.find({
      where: { friend: { id: userId }, isAccepted: false },
      relations: ['user'],
    });
  }

  async sentRequests(userId: number) {
    return this.friendshipRepo.find({
      where: { user: { id: userId }, isAccepted: false },
      relations: ['friend'],
    });
  }
}
