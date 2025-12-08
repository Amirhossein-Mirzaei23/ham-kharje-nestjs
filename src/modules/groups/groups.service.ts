// groups.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Friendship } from 'src/modules/friendship/entities/friendship.entity';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Friendship) private friendshipRepo: Repository<Friendship>,
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
  ) {}

  async create(dto: CreateGroupDto) {
    const owner = await this.userRepo.findOne({ where: { id: dto.ownerId } });
    if (!owner) throw new NotFoundException('Owner user not found');

    const group = this.groupRepo.create({
      name: dto.name,
      image: dto.image,
      owner,
    });
    return this.groupRepo.save(group);
  }

  async update(groupId: number, dto: UpdateGroupDto) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['owner'] });
    if (!group) throw new NotFoundException('Group not found');

    if (group.owner && group.owner.id !== dto.ownerId) throw new ForbiddenException('Only owner can update the group');

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.image !== undefined) group.image = dto.image;

    return this.groupRepo.save(group);
  }

  async remove(groupId: number, ownerId: number) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['owner'] });
    if (!group) throw new NotFoundException('Group not found');

    if (group.owner && group.owner.id !== ownerId) throw new ForbiddenException('Only owner can delete the group');

    // Option 1: remove group (onDelete: SET NULL will clear bills.group)
    return this.groupRepo.remove(group);
  }

async addFriendsToGroup(
  groupId: number,
  ownerId: number,
  friendIds: number[],
) {
  const group = await this.groupRepo.findOne({
    where: { id: groupId },
    relations: ['owner'],
  });

  if (!group) throw new NotFoundException('Group not found');
  if (!group.owner?.id || group.owner.id !== ownerId) throw new ForbiddenException('Only owner can add friends');

  // دریافت تمام userها
  const friends = await this.userRepo.findByIds(friendIds);
  if (friends.length !== friendIds.length)
    throw new BadRequestException('Some friends not found');

  // دریافت روابط friendship معتبر
  const friendships = await this.friendshipRepo.find({
    where: friendIds.map((fid) => [
      { user: { id: ownerId }, friend: { id: fid }, isAccepted: true },
      { user: { id: fid }, friend: { id: ownerId }, isAccepted: true },
    ]).flat(),
    relations: ['user', 'friend'],
  });

  // Assign همه‌ی دوستان به گروه
  for (const f of friendships) {
    f.group = group;
  }

  await this.friendshipRepo.save(friendships);

  return {
    ok: true,
    added: friendIds.length,
    friendships,
  };
}


  async removeFriendFromGroup(groupId: number, ownerId: number, friendId: number) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['owner'] });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.owner || group.owner.id !== ownerId) throw new ForbiddenException('Only owner can remove friends');

    const friendship = await this.friendshipRepo.findOne({
      where: [
        { user: { id: ownerId }, friend: { id: friendId } },
        { user: { id: friendId }, friend: { id: ownerId } },
      ],
    });
    
    if (!friendship) throw new NotFoundException('Friendship not found');

    if (friendship.group && friendship.group.id === group.id) {
      // friendship.group = null;
      console.log('if');
      
      await this.friendshipRepo.save(friendship);
      return { ok: true };
    }

    throw new BadRequestException('Friend is not part of this group');
  }

  async assignBillToGroup(groupId: number, dto: { ownerId: number; billId: number }) {
    const group = await this.groupRepo.findOne({ where: { id: groupId }, relations: ['owner'] });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.owner || group.owner.id !== dto.ownerId) throw new ForbiddenException('Only owner can assign bills to group');

    const bill = await this.billRepo.findOne({ where: { id: dto.billId }, relations: ['creditor', 'debtor', 'group'] });
    if (!bill) throw new NotFoundException('Bill not found');

    // optionally: ensure the bill's creditor or debtor is member of the group (depends on your rules)
    // we allow assigning any bill to group as long as owner authorizes
    bill.group = group;
    await this.billRepo.save(bill);

    return { ok: true, bill };
  }

async listUserGroups(
  userId: number,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;

  // 1) گروه‌هایی که کاربر owner آنهاست
  const ownedGroups = await this.groupRepo.find({
    where: { owner: { id: userId } },
  });

  // 2) گروه‌هایی که کاربر عضو آنهاست (از user -> friend)
  const memberships = await this.friendshipRepo.find({
    where: {
      isAccepted: true,
      group: { id: Not(IsNull()) },
      user: { id: userId },
    },
    relations: ['group'],
  });

  // 3) از طرف وارونه (friend -> user)
  const fromFriendSide = await this.friendshipRepo.find({
    where: {
      isAccepted: true,
      group: { id: Not(IsNull()) },
      friend: { id: userId },
    },
    relations: ['group'],
  });

  // 4) استخراج گروه‌ها بدون تکرار
  const memberGroups = [
    ...memberships.map((m) => m.group),
    ...fromFriendSide.map((m) => m.group),
  ];

  const allGroupsMap = new Map<number, Group>();
  [...ownedGroups, ...memberGroups].forEach((g) => {
    if (g) allGroupsMap.set(g.id, g);
  });

  const allGroups = [...allGroupsMap.values()];

  // 5) pagination
  const paginated = allGroups.slice(skip, skip + limit);

  // 6) فچ کردن همه friendship های مربوط به همه گروه‌های صفحه
  const groupIds = paginated.map((g) => g.id);

  const allFriendships = await this.friendshipRepo.find({
    where: {
      isAccepted: true,
      group: { id: In(groupIds) },
    },
    relations: ['user', 'friend', 'group'],
  });

  // 7) تبدیل اعضا به membersArray
  const resultWithMembers = paginated.map((group) => {
    const related = allFriendships.filter((f) => f.group?.id === group.id);

    // owner هم عضو محسوب می‌شود
    const members = new Map<number, User>();

    if (group.owner) members.set(group.owner.id, group.owner);

    for (const f of related) {
      members.set(f.user.id, f.user);
      members.set(f.friend.id, f.friend);
    }

    return {
      ...group,
      membersArray: [...members.values()],
    }; // .map((u) => this.toUserDto(u))
  });

  return {
    total: allGroups.length,
    page,
    limit,
    data: resultWithMembers,
  };
}


  async getById(groupId: number) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['owner', 'bills'],
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }


async getGroupMembers(groupId: number) {
  const group = await this.groupRepo.findOne({
    where: { id: groupId },
  });

  if (!group) throw new NotFoundException('Group not found');

  // گرفتن همهٔ دوستی‌هایی که عضو گروه هستند
  const memberships = await this.friendshipRepo.find({
    where: { group: { id: groupId }, isAccepted: true },
    relations: ['user', 'friend', 'group'],
  });

  // استخراج userهای واقعی عضو گروه
  const users = memberships.map((m) => {
    // هر friendship دو طرف دارد، کدام طرف عضو است؟
    return m.user.id === group.owner?.id ? m.friend : m.user;
  });

  return {
    groupId,
    membersCount: users.length,
    members: users,
  };
}



}
