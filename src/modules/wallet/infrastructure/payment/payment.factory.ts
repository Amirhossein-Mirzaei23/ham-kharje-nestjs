import { Injectable } from "@nestjs/common";
import { PaymentGateway } from "./payment.interface";
import { ZarinpalService } from "./zarinpal.service";
import { IdpayService } from "./idpay.service";

@Injectable()
export class PaymentFactory {
  constructor(
    private zarinpal: ZarinpalService,
    private idpay: IdpayService,
  ) {}

  get(gateway: string): PaymentGateway {
    switch (gateway) {
      case 'ZARINPAL':
        return this.zarinpal;
      case 'IDPAY':
        return this.idpay;
      default:
        throw new Error('Invalid gateway');
    }
  }
}
