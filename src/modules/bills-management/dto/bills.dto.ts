import { IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { PrimaryGeneratedColumn } from 'typeorm';

export class CreateBillDto {
  @IsNumber()
  creditorId: number;

  @IsNumber()
  debtorId: number;

  @PrimaryGeneratedColumn()
  @IsNumber()
  groupId?: number;

  @IsNumber()
  amount: number;
}
