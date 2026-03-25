import { IsNumber, IsOptional, IsBoolean, IsString } from 'class-validator';

export class CreateGroupBillDto {
  @IsNumber()
  creditorId: number;

  @IsString()
  title:string

  @IsNumber()
  debtorIds: number[];

  @IsOptional()
  @IsNumber()
  groupId?: number;
  

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  paid?: number;


  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;


  @IsOptional()
  @IsString()
  referenceId: string;
  
  @IsOptional()
  @IsNumber()
  totalAmount

}
