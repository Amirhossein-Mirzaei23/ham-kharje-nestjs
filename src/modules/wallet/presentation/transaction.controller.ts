import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateWalletTransactionDto } from '../application/dto/create-wallet-transaction.dto';
import { WalletTransactionService } from '../application/services/wallet-transaction.service';

@Controller('wallet/transactions')
export class TransactionController {
  constructor(
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  @Post()
  create(@Body() dto: CreateWalletTransactionDto) {
    return this.walletTransactionService.createTransaction(dto);
  }

  @Get('user/:userId')
  findUserHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletTransactionService.getUserHistory(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletTransactionService.getTransactionById(id);
  }
}
