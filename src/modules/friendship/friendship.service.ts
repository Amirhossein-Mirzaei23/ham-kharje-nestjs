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
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,

    @InjectRepository(Bill)
    private billRepo: Repository<Bill>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    private readonly usersService: UsersService,
  ) {}

  async sendFriendRequest(dto: SendFriendRequestDto) {
    const { senderId, receiverId } = dto;

    if (senderId === receiverId)
      throw new BadRequestException('شما نمیتوانید به خودتان درخواست بدهید.');

    const sender = await this.usersService.findOne(senderId);
    const receiver = await this.usersService.findOne(receiverId);

    if (!sender || !receiver)
      throw new NotFoundException('کاربر مد نظر یافت نشد');

    // check existing
    const existing = await this.friendshipRepo.findOne({
      where: { user: { id: senderId }, friend: { id: receiverId } },
    });
    if (existing) throw new BadRequestException('درخواست قبلا ارسال شده است.');
    const friendship = this.friendshipRepo.create({
      user: sender,
      friend: receiver,
    });

    const saved = await this.friendshipRepo.save(friendship);

    return saved;
    // return this.friendshipRepo.save(friendship);
  }

  async acceptRequest(dto: AcceptFriendRequestDto) {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: dto.friendshipId },
    });
    if (!friendship) throw new NotFoundException('درخواست یافت نشد');
    if (friendship.isAccepted)
      throw new BadRequestException('شما قبلا این درخواست را تایید کرده اید');

    friendship.isAccepted = true;
    const retrunFriendship = this.friendshipRepo.create({
      user: friendship.friend,
      friend: friendship.user,
      isAccepted: true,
    });
    const saved = await this.friendshipRepo.save(retrunFriendship);
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

  async listFriends(userId: number, options: { page: number; limit: number }) {
    const { page, limit } = options;

    // Get all friendships
    const [friendships, totalCount] = await this.friendshipRepo.findAndCount({
      where: [
        { friend: { id: userId }, isAccepted: true },
      ],
      skip: (page - 1) * 100,
      take: limit,
      relations: ['user', 'friend'],
    });

    const friends = friendships.map((fs) =>
      fs.user.id === userId ? fs.friend : fs.user,
    );

    // ------- Debt Calculation For Each Friend -------
    const results: Array<any> = [];

for (const friendInfo of friends) {
  const friendId = friendInfo.id;

  // one SELECT query per friend
const bills = await this.billRepo.find({
      where: [{ debtor: { id: userId } }, { creditor: { id: userId } }],
      relations: ['creditor', 'debtor'],
    });

    

  const unpaidOwesYou = bills.filter(
    (bill) =>
      bill.creditor?.id == userId &&
      bill.debtor?.id == friendId && !bill.isPaid
  );

  const unpaidYouOwe = bills.filter(
    (bill) =>
      bill.creditor?.id === friendId && bill.debtor?.id == userId && !bill.isPaid
  );

  

const totalOwseYou = unpaidOwesYou.reduce((sum, b) => sum + (b.amount - b.paid), 0);
const totalYouOwe = unpaidYouOwe.reduce((sum, b) => sum + (b.amount - b.paid), 0);

      results.push({
        friendInfo,
        totalOwseYou,
        totalYouOwe,        
        net: Math.abs(totalOwseYou - totalYouOwe)
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
