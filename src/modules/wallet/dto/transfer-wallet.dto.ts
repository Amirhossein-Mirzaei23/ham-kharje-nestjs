import { IsInt, Min } from 'class-validator';

export class TransferWalletDto {
  @IsInt()
  recipientUserId: number;

  @IsInt()
  @Min(1)
  amount: number;
}
