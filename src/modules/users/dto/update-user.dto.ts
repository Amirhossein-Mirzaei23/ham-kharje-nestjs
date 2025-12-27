import { IsString, IsEmail, IsPhoneNumber } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  name?: string;

  @IsString()
  image?: string;

  @IsEmail()
  email?: string;

  @IsPhoneNumber()
  phone?: string;

  @IsString()
  gender?: string;

  @IsString()
  password?: string;

  @IsString()
  subscription?: string;
}
