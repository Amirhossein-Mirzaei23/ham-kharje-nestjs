import { Type } from 'class-transformer';
import { IsString, IsEmail, IsPhoneNumber, IsOptional, ValidateNested } from 'class-validator';
import { PushSubscriptionDto } from 'src/push/dto/subscribe.dto';

export class UpdateUserDto {
  @IsString()
  name?: string;

  @IsString()
  image?: string;

  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phone?: string;

  @IsString()
  gender?: string;

  @IsString()
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription?: PushSubscriptionDto | null;
}
