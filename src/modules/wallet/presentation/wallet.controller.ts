import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { GetUserId } from 'src/modules/authentication/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/authentication/jwt-auth.guard';
import { ChargeWalletDto } from '../dto/charge-wallet.dto';
import { TransferWalletDto } from '../dto/transfer-wallet.dto';
import { VandarPaymentCallbackDto } from '../dto/vandar-payment-callback.dto';
import { WithdrawWalletDto } from '../dto/withdraw-wallet.dto';
import { WalletService } from '../wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Post('charge')
  chargeWallet(@GetUserId() userId: number, @Body() dto: ChargeWalletDto) {
    return this.walletService.chargeWallet(userId, dto);
  }

  @Public()
  @Get('callback')
  handleCallback(@Query() dto: VandarPaymentCallbackDto) {
    return this.walletService.handlePaymentCallback(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  transferWalletToWallet(
    @GetUserId() userId: number,
    @Body() dto: TransferWalletDto,
  ) {
    return this.walletService.transferWalletToWallet(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  withdrawToBank(@GetUserId() userId: number, @Body() dto: WithdrawWalletDto) {
    return this.walletService.withdrawToBank(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyWallet(@GetUserId() userId: number) {
    return this.walletService.getWalletByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/history')
  getMyWalletHistory(@GetUserId() userId: number) {
    return this.walletService.getWalletHistory(userId);
  }

  @Get(':userId')
  getWalletByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getWalletByUserId(userId);
  }

  @Get(':userId/history')
  getWalletHistoryByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getWalletHistory(userId);
  }
}
