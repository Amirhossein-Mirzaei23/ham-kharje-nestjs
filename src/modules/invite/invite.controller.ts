import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { InviteService } from './invite.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('create')
  create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateInviteDto,
    @Req() req: Request & { ip?: string },
  ) {
    return this.inviteService.create(dto, req.ip);
  }

  @Get(':id')
  resolve(@Param('id') id: string) {
    return this.inviteService.resolve(id);
  }

  @Post(':id/accept')
  accept(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AcceptInviteDto,
  ) {
    return this.inviteService.accept(id, dto);
  }
}
