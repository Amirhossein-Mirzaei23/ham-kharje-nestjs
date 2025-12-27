import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Authentication } from './entities/authentication.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(payload: RegisterDto): Promise<any> {
    const isUserPhoneExist = await this.usersService.findOneByPhone(payload.phone)     
    
    if (payload.email) {
      const isUserEmailExist = await this.usersService.findOneByEmail(payload.email)    
     if (isUserEmailExist)  throw new BadRequestException(`کاربری قبلا با این ایمیل ثبت نام کرده است.`);
    }
    if (isUserPhoneExist) throw new BadRequestException(`کاربری قبلا با این شماره تلفن ثبت نام کرده است.`);
    await this.usersService.create(payload)
    const userData =  await this.usersService.findOneByPhone(payload.phone)

    if (!userData) {
       throw new BadRequestException(`خطا در برقراری ارتباط با دیتابیس.`);
         }

    const token = this.jwtService.sign({
      id: userData.id,
      phone: userData.phone
    });
    this.jwtService.decode
    return { data: {userData ,token:token},message: 'Registered successflly' };
  }

  async login(payload:LoginDto): Promise<any> {
    const user = await this.usersService.findOneByPhone(payload.phone)     
    if (!user) throw new UnauthorizedException('کاربری با این شماره تلفن یافت نشد');
    if (user.password !== payload.password) throw new BadRequestException('رمز ورود اشتباه است');

    const token = this.jwtService.sign({
      id: user.id,
      phone: user.phone
    });
    this.jwtService.decode
    return { data: {user ,token:token},message: 'Logged in successfully' };
  }
}