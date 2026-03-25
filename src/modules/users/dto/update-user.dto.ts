import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  ValidateNested,
  Length,
} from 'class-validator';
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
  @IsString()
  @Length(24, 26)
  shebaNumber?: string;

  @IsOptional()
  @IsString()
  @Length(16, 19)
  cardNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription?: PushSubscriptionDto | null;
}
