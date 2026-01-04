import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { IsString } from 'class-validator';



export class PushSubscriptionDto {
  @IsString()
  endpoint: string;

  @IsObject()
  keys: {
    p256dh: string;
    auth: string;
  };
}



export class SubscribeDto {
  @IsNumber()
  userId: number;

  
  @IsOptional()
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription: PushSubscriptionDto;
}
