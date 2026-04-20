import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JibitTokenService } from './jibit-token.service';

@Injectable()
export class JibitTransferService {
  private readonly baseUrl =
    process.env.JIBIT_BASE_URL || 'https://napi.jibit.ir/cobank/v1';
  private readonly realIp = process.env.JIBIT_IP;
  private logger = new Logger('JibitTransfer');

  constructor(
    private readonly http: HttpService,
    private readonly jibitTokenService: JibitTokenService,
  ) {}

  async transfer(data: CreateTransferDto) {
    // اینجا دیگر توکن را مستقیم از env نمی‌خوانیم
    const accessToken = await this.jibitTokenService.getValidAccessToken();
this.logger.log(`JIBIT_API_KEY: ${process.env.JIBIT_API_KEY ? 'loaded' : 'missing'}`);
this.logger.log(`JIBIT_SECRET_KEY: ${process.env.JIBIT_SECRET_KEY ? 'loaded' : 'missing'}`);
this.logger.log(`JIBIT_IP: ${process.env.JIBIT_IP ? 'loaded' : 'missing'}`);

    const { data: resData } = await firstValueFrom(
      this.http.post(`${this.baseUrl}/orders/settlement`, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-REAL-IP': this.realIp,
          'Content-Type': 'application/json',
        },
      }),
    );

    return {
      success: true,
      data: resData,
    };
  }
}
