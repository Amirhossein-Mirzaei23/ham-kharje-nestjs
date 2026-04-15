import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMobilePhone,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class ChargeWalletDto {
  @IsInt()
  @Min(1000)
  amount: number;

  @IsUrl({ require_tld: false }, { message: 'callbackUrl must be a valid URL' })
  callbackUrl: string;

  @IsOptional()
  @IsMobilePhone('fa-IR')
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  factorNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  validCardNumbers?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
}
