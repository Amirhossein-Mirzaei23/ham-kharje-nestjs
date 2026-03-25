import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { TransactionType } from '../../domain/enums/transaction-type.enum';

export class CreateWalletTransactionDto {
  @IsOptional()
  @IsInt()
  walletId?: number;

  @IsInt()
  paidByUserId: number;

  @IsOptional()
  @IsInt()
  paidToUserId?: number;

  @IsOptional()
  @IsInt()
  billId?: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  gateway?: string;

  @IsOptional()
  referenceId?: string;

  @IsOptional()
  meta?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
