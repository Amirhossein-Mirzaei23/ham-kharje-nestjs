import { Injectable } from '@nestjs/common';
import { PaymentGateway } from './payment.interface';

@Injectable()
export class ZarinpalService implements PaymentGateway {
  async request(data) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        'https://api.zarinpal.com/pg/v4/payment/request.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchant_id: process.env.ZARINPAL_MERCHANT,
            amount: data.amount,
            callback_url: data.callbackUrl,
            description: data.description,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Zarinpal verify failed: ${res.status}`);
      }

      const resposnse = await res.json();

      return {
        authority: resposnse.data.authority,
        paymentUrl: `https://www.zarinpal.com/pg/StartPay/${resposnse.data.authority}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async verify(authority: string, amount: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        'https://api.zarinpal.com/pg/v4/payment/verify.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchant_id: process.env.ZARINPAL_MERCHANT,
            authority,
            amount,
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`Zarinpal verify failed: ${res.status}`);
      }

      const data = await res.json();

      // زرین‌پال: code === 100 یعنی موفق
      return data?.data?.code === 100 ? data.data : null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
