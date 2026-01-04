import { Controller, Get, Query } from "@nestjs/common";
import { VerifyPaymentUseCase } from "../application/use-cases/verify-payment.usecase";

// presentation/payment.controller.ts
@Controller('payment')
export class PaymentController {
  constructor(private verifyPayment: VerifyPaymentUseCase) {}

  /**
   * Example:
   * /payment/callback?Authority=xxx&Status=OK
   */
  @Get('callback')
  async callback(@Query() query: any) {
    const { Authority, Status } = query;

    await this.verifyPayment.execute(Authority, Status);

    return {
      success: true,
      message: 'Payment processed',
    };
  }
}
