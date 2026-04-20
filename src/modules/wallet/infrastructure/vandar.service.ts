import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface VandarChargeRequest {
  amount: number;
  callbackUrl: string;
  mobileNumber?: string;
  factorNumber?: string;
  description?: string;
  validCardNumbers?: string[];
  comment?: string;
}

interface VandarSettlementOptions {
  description?: string;
  name?: string;
}

@Injectable()
export class VandarService {
  private readonly apiBaseUrl: string;
  private readonly ipgBaseUrl: string;
  private readonly business: string;
  private readonly accessToken: string;
  private readonly ipgApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService.get<string>(
      'VANDAR_API_BASE_URL',
      'https://api.vandar.io',
    );
    this.ipgBaseUrl = this.configService.get<string>(
      'VANDAR_IPG_BASE_URL',
      'https://ipg.vandar.io',
    );
    this.business = this.configService.get<string>('VANDAR_BUSINESS', process.env.VANDAR_BUSINESS || '');
    this.accessToken = this.configService.get<string>('VANDAR_ACCESS_TOKEN', process.env.VANDAR_ACCESS_TOKEN || '');
    this.ipgApiKey = this.configService.get<string>('VANDAR_IPG_API_KEY', process.env.VANDAR_IPG_API_KEY || '');
  }

  async createPaymentToken(payload: VandarChargeRequest): Promise<{
    token: string;
    paymentUrl: string;
    raw: Record<string, unknown>;
  }> {
    this.ensureIpgApiKey();
    console.log('call vandar');
    
    const result = await this.request<{
      status: number;
      token?: string;
      errors?: unknown;
      message?: string;
    }>(`${this.ipgBaseUrl}/api/v4/send`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.ipgApiKey,
        amount: payload.amount,
        callback_url: payload.callbackUrl,
        mobile_number: payload.mobileNumber,
        factorNumber: payload.factorNumber,
        description: payload.description,
        valid_card_number: payload.validCardNumbers,
        comment: payload.comment,
      }),
    });
    console.log('result22:',result);
    
    if (result.status !== 1 || !result.token) {
      throw new BadGatewayException(
        result.message ?? 'Vandar did not return a valid payment token',
      );
    }

    return {
      token: result.token,
      paymentUrl: `${this.ipgBaseUrl}/v4/${result.token}`,
      raw: result as Record<string, unknown>,
    };
  }

  async verifyPayment(token: string): Promise<Record<string, unknown>> {
    this.ensureIpgApiKey();

    const result = await this.request<Record<string, unknown>>(
      `${this.ipgBaseUrl}/api/v4/verify`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.ipgApiKey,
          token,
        }),
      },
    );

    if (Number(result.status) !== 1) {
      throw new BadGatewayException(
        (result.message as string | undefined) ?? 'Vandar payment verification failed',
      );
    }

    return result;
  }

  async createSettlement(
    amount: number,
    iban: string,
    trackId: string,
    options?: VandarSettlementOptions,
  ): Promise<Record<string, unknown>> {
    this.ensureBusinessCredentials();

    return this.request<Record<string, unknown>>(
      `${this.apiBaseUrl}/v3/business/${this.business}/settlement/store`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          amount,
          iban,
          sheba: iban,
          track_id: trackId,
          description: options?.description,
          name: options?.name,
        }),
      },
    );
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const rawBody = await response.text();

    let body: T | { message?: string } = {} as T;
    let parsedJson = false;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as T;
        parsedJson = true;
      } catch {
        if (response.ok) {
          throw new BadGatewayException('Invalid JSON response received from Vandar');
        }
      }
    }

    if (!response.ok) {
      const providerMessage =
        parsedJson && body && typeof body === 'object'
          ? ((body as { message?: string; errors?: unknown }).message ??
            JSON.stringify((body as { errors?: unknown }).errors ?? body))
          : rawBody;
      const message = providerMessage
        ? `Vandar request failed with status ${response.status}: ${providerMessage}`
        : `Vandar request failed with status ${response.status}`;
      throw new BadGatewayException(message);
    }

    return body as T;
  }

  private ensureIpgApiKey(): void {
    if (!this.ipgApiKey) {
      throw new InternalServerErrorException('VANDAR_IPG_API_KEY is not configured');
    }
  }

  private ensureBusinessCredentials(): void {
    if (!this.business || !this.accessToken) {
      throw new InternalServerErrorException(
        'VANDAR_BUSINESS and VANDAR_ACCESS_TOKEN must be configured',
      );
    }
  }
}
