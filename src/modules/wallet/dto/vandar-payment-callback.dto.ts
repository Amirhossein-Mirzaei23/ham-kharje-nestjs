import { IsIn, IsOptional, IsString } from 'class-validator';

export class VandarPaymentCallbackDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsIn(['OK', 'FAILED'])
  payment_status?: 'OK' | 'FAILED';
}
