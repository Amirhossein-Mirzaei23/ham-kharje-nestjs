import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly httpService: HttpService) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`Sending OTP to ${phone}`);
    this.logger.debug(`OTP code for ${phone}: ${code}`);

    const url = 'https://api.iranpayamak.com/ws/v1/sms/pattern';

    const body = {
      code: 'tBitOjdepX',
      attributes: {
        code: code,
        otp:code
      },
      recipient: phone,
      line_number: '3000505',
      number_format: 'english',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'Api-Key': process.env.SEND_SMS_API_KEY,
          },
        }),
      );

      this.logger.log(`SMS sent to ${phone}`);
      this.logger.debug(response.data);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}`, error?.response?.data || error);
      throw error;
    }
  }
}
