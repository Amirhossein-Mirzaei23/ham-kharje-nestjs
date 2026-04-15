// groups.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Friendship } from 'src/modules/friendship/entities/friendship.entity';
import { GroupMembership } from 'src/modules/friendship/entities/groupMembership.entity';
import { Bill } from 'src/modules/bills-management/entities/bill.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateBillDto } from '../bills-management/dto/bills.dto';
import { BillService } from '../bills-management/bills.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateGroupBillDto } from './dto/create-group-bill.dto';
import { AddMemberByLinkDto } from './dto/add-member-to-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(GroupMembership)
    private groupMembershipRepo: Repository<GroupMembership>,
    @InjectRepository(Bill) private billRepo: Repository<Bill>,

    private readonly billService: BillService,
  ) {}

  async create(dto: CreateGroupDto) {
    const owner = await this.userRepo.findOne({ where: { id: dto.ownerId } });
    if (!owner) throw new NotFoundException('Owner user not found');

    const group = this.groupRepo.create({
      name: dto.name,
      image: dto.image,
      owner,
    });

    const createdGroup = await this.groupRepo.save(group);
    const memberships: GroupMembership[] = [];
    memberships.push(
      this.groupMembershipRepo.create({ group: createdGroup, user: owner }),
    );
    await this.groupMembershipRepo.save(memberships);

    return createdGroup;
  }

  async update(groupId: number, dto: UpdateGroupDto) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    if (!group) throw new NotFoundException('Group not found');

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.image !== undefined) group.image = dto.image;

    return this.groupRepo.save(group);
  }

  async remove(groupId: number, ownerId: number) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    if (!group) throw new NotFoundException('Group not found');

    if (group.owner && group.owner.id !== ownerId)
      throw new ForbiddenException('Only owner can delete the group');

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
    // if (!group.owner?.id || group.owner.id !== ownerId)
    //   throw new ForbiddenException('Only owner can add friends');

    // Find all users
    const friends = await this.userRepo.findByIds(friendIds);
    if (friends.length !== friendIds.length)
      throw new BadRequestException('Some friends not found');

    // Check valid friendships
    const friendships = await this.friendshipRepo.find({
      where: friendIds
        .map((fid) => [
          { user: { id: ownerId }, friend: { id: fid }, isAccepted: true },
          { user: { id: fid }, friend: { id: ownerId }, isAccepted: true },
        ])
        .flat(),
      relations: ['user', 'friend'],
    });

    // Add each friend to group via GroupMembership
    const memberships: GroupMembership[] = [];
    for (const friend of friends) {
      // Check if already member
      const exists = await this.groupMembershipRepo.findOne({
        where: { group: { id: groupId }, user: { id: friend.id } },
      });
      if (!exists) {
        memberships.push(
          this.groupMembershipRepo.create({ group, user: friend }),
        );
      }
    }
    await this.groupMembershipRepo.save(memberships);

    return {
      ok: true,
      added: memberships.length,
      memberships,
    };
  }
  async addGroupMemberByLink(payload: AddMemberByLinkDto) {
    const { groupId, hostUserId, newMemberUserId } = payload;

    if (hostUserId === newMemberUserId) {
      throw new BadRequestException('Host user and new member must be different');
    }

    return this.groupRepo.manager.transaction(async (manager) => {
      const groupRepo = manager.getRepository(Group);
      const userRepo = manager.getRepository(User);
      const friendshipRepo = manager.getRepository(Friendship);
      const groupMembershipRepo = manager.getRepository(GroupMembership);

      const group = await groupRepo.findOne({
        where: { id: groupId },
        relations: ['owner'],
      });
      if (!group) throw new NotFoundException('Group not found');

      const hostUser = await userRepo.findOne({ where: { id: hostUserId } });
      if (!hostUser) throw new NotFoundException('Host user not found');

      const newMemberUser = await userRepo.findOne({
        where: { id: newMemberUserId },
      });
      if (!newMemberUser) throw new NotFoundException('New member user not found');

      const hostMembership = await groupMembershipRepo.findOne({
        where: { group: { id: groupId }, user: { id: hostUserId } },
        relations: ['group', 'user'],
      });
      const isHostInGroup =
        group.owner?.id === hostUserId || Boolean(hostMembership);

      if (!isHostInGroup) {
        throw new ForbiddenException('Host user is not a member of this group');
      }

      const existingMembership = await groupMembershipRepo.findOne({
        where: { group: { id: groupId }, user: { id: newMemberUserId } },
      });

      if (!existingMembership) {
        await groupMembershipRepo.save(
          groupMembershipRepo.create({ group, user: newMemberUser }),
        );
      }

      const hostFriendIds = Array.isArray(hostUser.friends) ? hostUser.friends : [];
      if (!hostFriendIds.includes(newMemberUserId)) {
        hostUser.friends = [...hostFriendIds, newMemberUserId];
        await userRepo.save(hostUser);
      }

      const newMemberFriendIds = Array.isArray(newMemberUser.friends)
        ? newMemberUser.friends
        : [];
      if (!newMemberFriendIds.includes(hostUserId)) {
        newMemberUser.friends = [...newMemberFriendIds, hostUserId];
        await userRepo.save(newMemberUser);
      }

      const directFriendship = await friendshipRepo.findOne({
        where: { user: { id: hostUserId }, friend: { id: newMemberUserId } },
      });
      if (!directFriendship) {
        await friendshipRepo.save(
          friendshipRepo.create({
            user: hostUser,
            friend: newMemberUser,
            isAccepted: true,
          }),
        );
      } else if (!directFriendship.isAccepted) {
        directFriendship.isAccepted = true;
        await friendshipRepo.save(directFriendship);
      }

      const reverseFriendship = await friendshipRepo.findOne({
        where: { user: { id: newMemberUserId }, friend: { id: hostUserId } },
      });
      if (!reverseFriendship) {
        await friendshipRepo.save(
          friendshipRepo.create({
            user: newMemberUser,
            friend: hostUser,
            isAccepted: true,
          }),
        );
      } else if (!reverseFriendship.isAccepted) {
        reverseFriendship.isAccepted = true;
        await friendshipRepo.save(reverseFriendship);
      }

      return {
        ok: true,
        message: 'User added to group successfully by link',
        groupId,
        hostUserId,
        newMemberUserId,
        alreadyMember: Boolean(existingMembership),
      };
    });
  }
  async removeFriendFromGroup(
    groupId: number,
    ownerId: number,
    friendId: number,
  ) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.owner || group.owner.id !== ownerId)
      throw new ForbiddenException('Only owner can remove friends');

    const membership = await this.groupMembershipRepo.findOne({
      where: { group: { id: groupId }, user: { id: friendId } },
    });
    if (!membership)
      throw new NotFoundException('Friend is not part of this group');
    await this.groupMembershipRepo.remove(membership);
    return { ok: true };
  }

  async assignBillToGroup(
    groupId: number,
    dto: { ownerId: number; billId: number },
  ) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.owner || group.owner.id !== dto.ownerId)
      throw new ForbiddenException('Only owner can assign bills to group');

    const bill = await this.billRepo.findOne({
      where: { id: dto.billId },
      relations: ['creditor', 'debtor', 'group'],
    });
    if (!bill) throw new NotFoundException('Bill not found');

    // optionally: ensure the bill's creditor or debtor is member of the group (depends on your rules)
    // we allow assigning any bill to group as long as owner authorizes
    bill.group = group;
    await this.billRepo.save(bill);

    return { ok: true, bill };
  }

  async createBillForGroupMembers(
    groupId: number,
    payload: CreateGroupBillDto,
  ) {
    let errors: Array<any> = [];
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    const groupMembers = await this.groupMembershipRepo.find({
      where: { group: { id: groupId } },
      relations: ['user'],
    });

    if (!group) throw new NotFoundException('Group not found');
    if (!groupMembers.length) throw new NotFoundException('members not found');
    if (!payload.debtorIds.length)
      throw new NotFoundException('debtorIds not found');

    try {
      let creditorBill;
      const batchReferenceId = uuidv4();
      await Promise.all(
        payload.debtorIds.map(async (debtorId) => {
          const billpayload: CreateBillDto = {
            creditorId: payload.creditorId,
            debtorId: debtorId,
            title: payload.title,
            amount: payload.amount / payload.debtorIds.length,
            groupId: group.id,
            referenceId: batchReferenceId,
            totalAmount: payload.amount,
          };
          if (payload.creditorId === debtorId) {
            ((billpayload.paid = payload.amount / payload.debtorIds.length),
              (billpayload.isPaid = true));
          }

          const bill = await this.billService.createBill(billpayload);
        }),
      );
    } catch (err) {
      errors.push(err);
    }

    return {
      data: { group: group, members: groupMembers },
      errors,
      message: errors.length < 1 ? 'با موفقیت ثبت شد.' : 'خطا',
    };
  }
  async listUserGroups(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // 1) گروه‌هایی که کاربر owner آنهاست
    const ownerUser = await this.userRepo.find({
      where: { id: userId },
    });
    const ownedGroups = await this.groupRepo.find({
      where: { owner: { id: userId } },
    });

    // 2) گروه‌هایی که کاربر عضو آنهاست
    const memberships = await this.groupMembershipRepo.find({
      where: { user: { id: userId } },
      relations: ['group'],
    });

    // 3) استخراج گروه‌ها بدون تکرار
    const memberGroups = memberships.map((m) => m.group);

    const allGroupsMap = new Map<number, Group>();
    [...ownedGroups, ...memberGroups].forEach((g) => {
      if (g) allGroupsMap.set(g.id, g);
    });

    const allGroups = [...allGroupsMap.values()];
    allGroups.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 4) pagination
    const paginated = allGroups.slice(skip, skip + limit);

    // 5) گرفتن همه اعضای گروه‌های صفحه
    const groupIds = paginated.map((g) => g.id);
    const allMemberships = await this.groupMembershipRepo.find({
      where: { group: { id: In(groupIds) } },
      relations: ['user', 'group'],
    });

    // 6) تبدیل اعضا به membersArray
    const resultWithMembers = paginated.map((group) => {
      const related = allMemberships.filter((m) => m.group?.id === group.id);
      // owner هم عضو محسوب می‌شود
      const members = new Map<number, User>();
      if (group.owner) members.set(group.owner.id, group.owner);
      for (const m of related) {
        members.set(m.user.id, m.user);
      }
      return {
        ...group,
        owner: ownerUser,
        membersArray: [...members.values()],
      };
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
      relations: ['owner', 'bills', 'bills.creditor', 'bills.debtor'],
    });
    const memberships = await this.groupMembershipRepo.find({
      where: { group: { id: groupId } },
      relations: ['user'],
    });

    if (!group) throw new NotFoundException('Group not found');
    console.log('bills old',group.bills[0]);
    group.bills = group.bills.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    console.log('bills',group.bills[0]);
    
    const data = {
      group: {
        id: group.id,
        name: group.name,
        owner: group.owner,
        image: group.image || null,
      },
      bills: group.bills,
      pendingBills: group.bills.filter((b) => !b.isPaid),
      members: memberships,
    };
    return data;
  }

  async getGroupMembers(groupId: number) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    // Get all memberships for this group
    const memberships = await this.groupMembershipRepo.find({
      where: { group: { id: groupId } },
      relations: ['user'],
    });
    const users = memberships.map((m) => m.user);
    return {
      groupId,
      membersCount: users.length,
      members: users,
    };
  }
}
