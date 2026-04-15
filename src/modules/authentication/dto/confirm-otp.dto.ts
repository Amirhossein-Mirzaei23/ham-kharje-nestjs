import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class ConfirmOtpDto {
  @IsPhoneNumber('IR')
  phone: string;

  @IsString()
  @Length(4, 6)
  code: string;
}
