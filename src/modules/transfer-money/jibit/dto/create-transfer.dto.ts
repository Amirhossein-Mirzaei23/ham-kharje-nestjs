import { IsString, IsUUID, IsNumber, IsOptional, Matches } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  recordTrackId!: string;

  @IsString()
  transferType!: 'NORMAL' | 'ACH' | 'RTGS';

  @IsString()
  transferReason!:
    | 'VARIZ_HOGHOUGH'
    | 'TADIE_DOYOUN'
    | 'MOAMELAT_MANGHOUL'
    | 'MOAMELAT_GHEIR_MANGHOUL'
    | 'MODIRIRAT_NAGHDINEGI'
    | 'MODIRIAT_NAGHDINEGI'
    | 'KHARID_KALA'
    | 'KHARID_KHADAMAT';

  @IsOptional()
  @IsString()
  sourceIban?: string;

  @IsString()
  destinationIban!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @Matches(/^[0-9]*$/, { message: 'paymentId باید فقط عدد باشد' })
  paymentId?: string;

  @IsOptional()
  @IsString()
  requestDescription?: string;
}
