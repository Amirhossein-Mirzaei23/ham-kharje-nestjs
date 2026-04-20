import {
  ArrayMaxSize,
  IsArray,
  IsMobilePhone,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class PayBillDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

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
