import { IsNumber, IsString } from 'class-validator';

export class SendPushDto {
  @IsNumber()
  userId: number;

  @IsString()
  title: string;

  @IsString()
  message: string;
}
