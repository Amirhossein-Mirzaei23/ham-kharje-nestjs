import { IsString, IsNotEmpty, IsPhoneNumber, IsEmail } from "class-validator";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsPhoneNumber('IR')
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEmail()
  email?:string;
}
