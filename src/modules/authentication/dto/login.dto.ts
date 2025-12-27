import { IsEmail, IsString } from "class-validator";

export class LoginDto {
  @IsString()
  phone: string;

  @IsEmail()
  email?: string;

  @IsString()
  gender?: string;

  @IsString()
  password: string;
}