import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class PayBillDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsInt()
  payerUserId: number;
}
