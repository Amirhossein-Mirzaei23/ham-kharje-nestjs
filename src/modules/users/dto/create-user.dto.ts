import { IsString, IsEmail, IsPhoneNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phone?: string;

  @IsString()
  gender?: string;

  @IsString()
  password: string;

  @IsBoolean()
  isVerified?: boolean;

  @IsBoolean()
  verificationCode?: string;

  @IsArray()
  friends?: number[];
}
