import { IsIBAN, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class WithdrawWalletDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsIBAN()
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
