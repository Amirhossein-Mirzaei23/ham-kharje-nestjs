import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Get,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { CreateFriendDto } from './dto/create-friend.dto';
import {
  AcceptFriendRequestDto,
  SendFriendRequestDto,
  UpdateFriendDto,
} from './dto/update-friend.dto';
import { GetUserId } from '../authentication/get-user.decorator';
import { JwtAuthGuard } from '../authentication/jwt-auth.guard';
import { AddFrinedByLinkDto } from './dto/add-freind-by-link.dto';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('send')
  send(@Body() dto: SendFriendRequestDto) {
    return this.friendshipService.sendFriendRequest(dto);
  }

  @Patch('accept')
  accept(@Body() dto: AcceptFriendRequestDto) {
    return this.friendshipService.acceptRequest(dto);
  }
  @Post('/add-friend-by-link')
  addGroupMemberByLink(@Body() dto: AddFrinedByLinkDto) {
    return this.friendshipService.addFriendByLink(dto);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.friendshipService.deleteRequest(id);
  }

  @Get('list/:id')
  listFriends(
    @Param('id') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.friendshipService.listFriends(userId, { page, limit });
  }

  @Get('pending/:id')
  pending(@Param('id') id: number) {
    return this.friendshipService.pendingRequests(id);
  }

  @Get('sent/:id')
  sent(@Param('id') id: number) {
    return this.friendshipService.sentRequests(id);
  }
}
