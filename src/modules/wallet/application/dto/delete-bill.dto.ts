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

export class DeleteBillDto {
  @IsNumber()
  userId

 @IsString()
  referenceId
}
