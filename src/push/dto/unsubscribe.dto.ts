import { IsNumber, IsString } from 'class-validator';

export class UnsubscribeDto {
  @IsNumber()
  userId: number;

  @IsString()
  endpoint: string;
}
