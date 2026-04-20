import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

interface JibitTokenResponse {
  accessToken: string;
  refreshToken: string;
  scopes: string[];
}

@Injectable()
export class JibitTokenService {
  private readonly logger = new Logger(JibitTokenService.name);

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null; // timestamp ms

  private readonly baseUrl = process.env.JIBIT_BASE_URL || 'https://napi.jibit.ir/cobank/v1';
  private readonly apiKey = process.env.JIBIT_API_KEY;
  private readonly secretKey = process.env.JIBIT_SECRET_KEY;
  private readonly scopes = (process.env.JIBIT_SCOPES || 'SETTLEMENT').split(',');
  private readonly realIp = process.env.JIBIT_IP;

  constructor(private readonly http: HttpService) {}

  /**
   * متد عمومی: همیشه قبل از فراخوانی سرویس‌های جیبیت از این استفاده کن
   */
  async getValidAccessToken(): Promise<string> {
    // اگر توکن نداریم، یا منقضی شده، سعی کن رفرش کنی یا دوباره بگیر
    if (!this.accessToken || this.isExpired()) {
      this.logger.log('AccessToken is missing or expired. Trying to refresh/generate...');
      if (this.refreshToken) {
        try {
          await this.refreshTokenRequest();
        } catch (err) {
          this.logger.warn('Refresh token failed, generating new token...');
          await this.generateTokenRequest();
        }
      } else {
        await this.generateTokenRequest();
      }
    }

    return this.accessToken!;
  }

  private isExpired(): boolean {
    if (!this.expiresAt) return true;
    // 5 دقیقه قبل از انقضا، توکن را منقضی در نظر می‌گیریم
    const now = Date.now();
    return now >= this.expiresAt - 5 * 60 * 1000;
  }

  /**
   * درخواست generate token
   */
  private async generateTokenRequest(): Promise<void> {
    this.logger.log('Requesting new Jibit access token (generate)...');

    const body = {
      apiKey: this.apiKey,
      secretKey: this.secretKey,
      scopes: this.scopes,
    };

    this.logger.log(`JIBIT_API_KEY: ${process.env.JIBIT_API_KEY ? 'loaded' : 'missing'}`);
this.logger.log(`JIBIT_SECRET_KEY: ${process.env.JIBIT_SECRET_KEY ? 'loaded' : 'missing'}`);
this.logger.log(`JIBIT_IP: ${process.env.JIBIT_IP ? 'loaded' : 'missing'}`);

    const { data } = await firstValueFrom(
      this.http.post<JibitTokenResponse>(`${this.baseUrl}/tokens/generate`, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-REAL-IP': this.realIp,
        },
      }),
    );

    this.setTokenData(data);
    this.logger.log('New Jibit access token generated successfully.');
  }

  /**
   * درخواست refresh token
   */
  private async refreshTokenRequest(): Promise<void> {
    this.logger.log('Refreshing Jibit access token...');

    const body = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    };

    const { data } = await firstValueFrom(
      this.http.post<JibitTokenResponse>(`${this.baseUrl}/tokens/refresh`, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-REAL-IP': this.realIp,
        },
      }),
    );

    this.setTokenData(data);
    this.logger.log('Jibit access token refreshed successfully.');
  }

  private setTokenData(data: JibitTokenResponse) {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;

    // طبق داک می‌دانیم توکن ۱۰ ساعت اعتبار دارد => 10 * 60 * 60 * 1000 ms
    const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
    this.expiresAt = Date.now() + TEN_HOURS_MS;
  }
}
