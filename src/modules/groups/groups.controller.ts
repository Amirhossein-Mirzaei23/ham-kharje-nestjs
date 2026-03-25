// groups.controller.ts
import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Get,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddFriendToGroupDto } from './dto/add-friend-to-group.dto';
import { AssignBillDto } from './dto/assign-bill.dto';
import { CreateBillDto } from '../bills-management/dto/bills.dto';
import { CreateGroupBillDto } from './dto/create-group-bill.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('create')
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch('update/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete('delete/:id/:ownerId')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('ownerId', ParseIntPipe) ownerId: number,
  ) {
    return this.groupsService.remove(id, ownerId);
  }

  @Post(':id/add-friends')
  addFriends(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ownerId: number; friendIds: number[] },
  ) {
    return this.groupsService.addFriendsToGroup(
      id,
      body.ownerId,
      body.friendIds,
    );
  }

  @Post(':id/remove-friend')
  removeFriend(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ownerId: number; friendId: number },
  ) {
    return this.groupsService.removeFriendFromGroup(
      id,
      body.ownerId,
      body.friendId,
    );
  }

  @Post(':id/assign-bill')
  assignBillToGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignBillDto,
  ) {
    return this.groupsService.assignBillToGroup(id, dto);
  }



  @Post(':id/create-bill')
  createBillForGroupMembers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateGroupBillDto,
  ) {
    return this.groupsService.createBillForGroupMembers(id, dto);
  }


  @Post('list')
  listUserGroups(
    @Body() body: { userId: number; page: number; limit: number },
  ) {
    return this.groupsService.listUserGroups(
      body.userId,
      Number(body.page),
      Number(body.limit),
    );
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getById(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: number) {
    return this.groupsService.getGroupMembers(id);
  }
}
