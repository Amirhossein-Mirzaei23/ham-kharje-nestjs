import { IsNumber, IsOptional, IsBoolean, IsString } from 'class-validator';

export class CreateBillDto {
  @IsNumber()
  creditorId: number;

  @IsString()
  title:string

  @IsNumber()
  debtorId?: number;

  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsNumber()
  amount: number;
  @IsOptional()
  @IsString()
  referenceId: string;

}
