import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ChargeWalletUseCase } from '../application/use-cases/charge-wallet.usecase';
import { VerifyPaymentUseCase } from '../application/use-cases/verify-payment.usecase';
import { WalletRepositoryImpl } from '../infrastructure/persistence/wallet.repository.impl';
import { WalletTransactionService } from '../application/services/wallet-transaction.service';

@Controller('wallet')
export class WalletController {
  constructor(
    private chargeWallet: ChargeWalletUseCase,
    private verifyPayment: VerifyPaymentUseCase,
    private walletRepo: WalletRepositoryImpl,
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  @Post('charge')
  charge(@Req() req, @Body() dto) {
    return this.chargeWallet.execute(req.user.id, dto.amount, dto.gateway);
  }

  @Get('payment/callback')
  callback(@Query() q) {
    return this.verifyPayment.execute(q.Authority, q.Status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const userId = Number(id);
    if (isNaN(userId)) {
      throw new BadRequestException('400 - user id is not valid');
    }
    console.log('userid',userId);
    
    return this.walletRepo.findByUserId(userId);
  }

  @Post('create/:id')
  async find(@Param('id') id: string) {
    const userId = Number(id);
    if (isNaN(userId)) {
      throw new BadRequestException('400 - user id is not valid');
    }
    const wallet = await this.walletRepo.findByUserId(userId);

    if (wallet && wallet.id) {
      throw new BadRequestException('400 - this user has a wallet');
    }
    return this.walletRepo.createForUser(userId);
  }
  @Get()
  findAll(): Promise<{ count: number; data }> {
    let data: Array<any>;
    let count;
    return this.walletRepo
      .findAll()
      .then((res) => {
        data = res;
        count = data?.length;

        return { count, data };
      })
      .catch((err) => {
        return err as any;
      });
  }

  @Get('history/:id')
  findHistory(@Param('id') id: string) {
    const userId = Number(id);
    if (isNaN(userId)) {
      throw new BadRequestException('400 - user id is not valid');
    }

    return this.walletTransactionService.getUserHistory(userId);
  }
}
