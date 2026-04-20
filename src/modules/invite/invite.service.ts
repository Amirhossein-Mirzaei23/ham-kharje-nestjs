import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Invite } from './entities/invite.entity';
import { GroupMembership } from '../friendship/entities/groupMembership.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';

const INVITE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

type InviteRateLimitEntry = {
  count: number;
  resetAt: number;
};

@Injectable()
export class InviteService {
  private readonly createWindowMs = 15 * 60 * 1000;
  private readonly maxCreatesPerWindow = 10;
  private readonly inviteBaseUrl = (
    process.env.Site_BASE_URL ?? 'https://mysite.com'
  ).replace(/\/+$/, '');
  private readonly createRateLimitStore = new Map<string, InviteRateLimitEntry>();

  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(GroupMembership)
    private readonly groupMembershipRepo: Repository<GroupMembership>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateInviteDto, requesterIp?: string) {
    this.enforceCreateRateLimit(dto.inviterId, requesterIp);
    const inviter = await this.userRepo.findOne({
      where: { id: dto.inviterId },
    });
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    if (!dto.groupId) {
      const invite = this.inviteRepo.create({
      id: generateInviteId(),
      inviterId: inviter.id,
      inviter,
      used: false,
    });

    const savedInvite = await this.inviteRepo.save(invite);
     return {
      inviteId: savedInvite.id,
      url: `${this.inviteBaseUrl}/invite/${savedInvite.id}`,
    };
    }
    const group = await this.groupRepo.findOne({
      where: { id: dto.groupId },
      relations: ['owner'],
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const inviterMembership = await this.groupMembershipRepo.findOne({
      where: { group: { id: dto.groupId }, user: { id: dto.inviterId } },
      relations: ['group', 'user'],
    });

    if (!inviterMembership && group.owner?.id !== dto.inviterId) {
      throw new ForbiddenException(
        'Inviter must already be a member of the target group',
      );
    }

    const invite = this.inviteRepo.create({
      id: generateInviteId(),
      groupId: group.id,
      inviterId: inviter.id,
      group,
      inviter,
      used: false,
    });

    const savedInvite = await this.inviteRepo.save(invite);

    return {
      inviteId: savedInvite.id,
      url: `${this.inviteBaseUrl}/invite/${savedInvite.id}`,
    };
  }

  async resolve(inviteId: string) {
    const invite = await this.findValidInvite(inviteId);
    const group = await this.groupRepo.findOne({
      where: { id: invite.groupId },
      relations: ['owner'],
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const inviter = await this.userRepo.findOne({
      where: { id: invite.inviterId },
    });
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const memberships = await this.groupMembershipRepo.find({
      where: { group: { id: group.id } },
      relations: ['user'],
    });
    const members = memberships.map(item=>{
      return item.user
    })


    return {
      group: group,
      members:members,
      inviter: inviter,
    };
  }

  async accept(inviteId: string, dto: AcceptInviteDto) {
    return this.inviteRepo.manager.transaction(async (manager) => {
      const inviteRepository = manager.getRepository(Invite);
      const membershipRepository = manager.getRepository(GroupMembership);
      const userRepository = manager.getRepository(User);

      const invite = await inviteRepository.findOne({
        where: { id: inviteId },
        lock: { mode: 'pessimistic_write' },
      });

      const activeInvite = this.assertInviteIsUsable(invite);

      const user = await userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingMembership = await membershipRepository.find({
        where: { group: { id: activeInvite.groupId } },
        relations:['user']
      });

      if (existingMembership) {
        throw new ConflictException('User is already a member of the group');
      }

      const group = await manager.getRepository(Group).findOne({
        where: { id: activeInvite.groupId },
      });
      if (!group) {
        throw new NotFoundException('Group not found');
      }

      await membershipRepository.save(
        membershipRepository.create({
          group,
          user,
        }),
      );

      activeInvite.used = true;
      await inviteRepository.save(activeInvite);

      return {
        success: true,
        message: 'User added to group',
      };
    });
  }

  private async findValidInvite(inviteId: string) {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId },
    });

    return this.assertInviteIsUsable(invite);
  }

  private assertInviteIsUsable(invite: Invite | null): Invite {
    if (!invite) {
      throw new GoneException('Invite is invalid or expired');
    }

    if (invite.used || invite.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Invite is invalid or expired');
    }

    return invite;
  }

  private enforceCreateRateLimit(inviterId: number, requesterIp?: string) {
    if (!Number.isInteger(inviterId)) {
      throw new BadRequestException('inviterId must be an integer');
    }

    const bucketKey = `${requesterIp ?? 'unknown'}:${inviterId}`;
    const now = Date.now();
    const current = this.createRateLimitStore.get(bucketKey);

    if (!current || current.resetAt <= now) {
      this.createRateLimitStore.set(bucketKey, {
        count: 1,
        resetAt: now + this.createWindowMs,
      });
      return;
    }

    if (current.count >= this.maxCreatesPerWindow) {
      throw new HttpException(
        'Too many invite creation attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    this.createRateLimitStore.set(bucketKey, current);
  }
}

function generateInviteId() {
  const bytes = randomBytes(10);
  let id = '';

  for (const byte of bytes) {
    id += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
  }

  return id;
}
