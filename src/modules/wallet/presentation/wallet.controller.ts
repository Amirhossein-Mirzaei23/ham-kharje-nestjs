import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ChargeWalletUseCase } from "../application/use-cases/charge-wallet.usecase";
import { VerifyPaymentUseCase } from "../application/use-cases/verify-payment.usecase";

@Controller('wallet')
export class WalletController {
  constructor(
    private chargeWallet: ChargeWalletUseCase,
    private verifyPayment: VerifyPaymentUseCase,
  ) {}

  @Post('charge')
  charge(@Req() req, @Body() dto) {
    return this.chargeWallet.execute(req.user.id, dto.amount, dto.gateway);
  }

  @Get('payment/callback')
  callback(@Query() q) {
    return this.verifyPayment.execute(q.Authority, q.Status);
  }
}
