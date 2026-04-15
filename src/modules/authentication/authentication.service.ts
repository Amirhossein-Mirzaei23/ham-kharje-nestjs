import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
// import { Authentication } from './entities/authentication.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { WalletRepositoryImpl } from '../wallet/infrastructure/persistence/wallet.repository.impl';
import { PhoneOtp } from './entities/phone-otp.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';
import { SmsService } from './services/sms.service';
import { User } from '../users/entities/user.entity';
@Injectable()
export class AuthenticationService {
  private static readonly OTP_EXPIRY_MS = 2 * 60 * 1000;
  private static readonly REGISTER_WINDOW_MS = 10 * 60 * 1000;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly RESEND_COOLDOWN_MS = 10 * 1000;
  private static readonly IP_WINDOW_MS = 10 * 60 * 1000;
  private static readonly IP_MAX_REQUESTS = 10;
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly usersService: UsersService,
    private walletRepo: WalletRepositoryImpl,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(PhoneOtp)
    private readonly phoneOtpRepository: Repository<PhoneOtp>,
  ) {}

  async register(payload: RegisterDto): Promise<any> {
    const otpRecord = await this.phoneOtpRepository.findOne({
      where: { phone: payload.phone },
    });

    if (
      !otpRecord ||
      !otpRecord.isVerified ||
      !otpRecord.registerAllowedUntil ||
      otpRecord.registerAllowedUntil.getTime() < Date.now()
    ) {
      throw new BadRequestException('Phone number is not verified.');
    }

    const isUserPhoneExist = await this.usersService.findOneByPhone(payload.phone)     
    
    if (payload.email) {
      const isUserEmailExist = await this.usersService.findOneByEmail(payload.email)    
     if (isUserEmailExist)  throw new BadRequestException(`کاربری قبلا با این ایمیل ثبت نام کرده است.`);
    }
    if (isUserPhoneExist) throw new BadRequestException(`کاربری قبلا با این شماره تلفن ثبت نام کرده است.`);
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    await this.usersService.create({
      ...payload,
      password: hashedPassword,
      isVerified: true,
    });
    const userData =  await this.usersService.findOneByPhone(payload.phone)

    if (!userData) {
       throw new BadRequestException(`خطا در برقراری ارتباط با دیتابیس.`);
         }

    const token = this.jwtService.sign({
      id: userData.id,
      phone: userData.phone
    });
    this.jwtService.decode
    await this.walletRepo.createForUser(userData.id);
    await this.phoneOtpRepository.delete({ phone: payload.phone });
    return { data: {userData ,token:token},message: 'Registered successflly' };
  }

  async login(payload:LoginDto): Promise<any> { 
     const user = await this.userRepo.findOne({
      where: {
        phone : payload.phone
      },
      select: ['id','password','phone','cardNumber','email','shebaNumber','gender','image','name']
  });
    if (!user) throw new UnauthorizedException('کاربری با این شماره تلفن یافت نشد');
    const isPasswordValid = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordValid) throw new BadRequestException('رمز ورود اشتباه است');

    const token = this.jwtService.sign({
      id: user.id,
      phone: user.phone
    });
    this.jwtService.decode
    user.password = ''
    return { data: { user ,token:token},message: 'Logged in successfully' };
  }

  async sendOtp(payload: SendOtpDto, ipAddress: string): Promise<{ message: string }> {
    // await this.ensurePhoneIsAvailable(payload.phone);
    await this.enforceIpThrottle(ipAddress);
    const existingOtp = await this.phoneOtpRepository.findOne({
      where: { phone: payload.phone },
    });

    // if (
    //   existingOtp?.lastSentAt &&
    //   existingOtp.lastSentAt.getTime() + AuthenticationService.RESEND_COOLDOWN_MS >
    //     Date.now()
    // ) {
    //   this.logger.log('lastSentAt',existingOtp.lastSentAt.getTime())
    //   // this.logger.log('existingOtp?.lastSentAt',existingOtp.lastSentAt.getTime() + AuthenticationService.RESEND_COOLDOWN_MS , Date.now());
    //   throw new BadRequestException('برای ارسال مجدد کد 10 ثانیه صبر کنید.');
    // }

    await this.issueOtp(payload.phone, ipAddress, existingOtp ?? undefined);

    return { message: 'کد با موفقیت ارسال شد' };
  }

  async resendOtp(payload: SendOtpDto, ipAddress: string): Promise<{ message: string }> {
    return this.sendOtp(payload, ipAddress);
  }

  async confirmOtp(payload: ConfirmOtpDto): Promise<{ message: string }> {
    const otpRecord = await this.phoneOtpRepository.findOne({
      where: { phone: payload.phone },
    });

    if (!otpRecord) {
      throw new BadRequestException('درخواستی برای کد ورود ثبت نشده است.');
    }

    if (otpRecord.attempts >= AuthenticationService.MAX_ATTEMPTS) {
      throw new BadRequestException('به حد مجاز درخواست رسیده اید.');
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('کد OTP منفضی شده است لطفا مجدد درخواست بدهید');
    }

    const isValid = await bcrypt.compare(payload.code, otpRecord.codeHash);
    if (!isValid) {
      otpRecord.attempts += 1;
      await this.phoneOtpRepository.save(otpRecord);
      throw new BadRequestException('کد وارد شده صحیح نمیباشد.');
    }

    otpRecord.isVerified = true;
    otpRecord.attempts = 0;
    otpRecord.verifiedAt = new Date();
    otpRecord.registerAllowedUntil = new Date(
      Date.now() + AuthenticationService.REGISTER_WINDOW_MS,
    );
    await this.phoneOtpRepository.save(otpRecord);

    return { message: 'Phone number verified successfully.' };
  }

  private async issueOtp(
    phone: string,
    ipAddress: string,
    existingOtp?: PhoneOtp,
  ): Promise<void> {
    const otpCode = this.generateOtpCode(); // phone.slice(-6)
    // 
    const codeHash = await bcrypt.hash(otpCode, 10);
    const now = new Date();

    const otpRecord =
      existingOtp ??
      this.phoneOtpRepository.create({
        phone,
      });

    otpRecord.codeHash = codeHash;
    otpRecord.expiresAt = new Date(Date.now() + AuthenticationService.OTP_EXPIRY_MS);
    otpRecord.attempts = 0;
    otpRecord.sendCount = (otpRecord.sendCount ?? 0) + 1;
    otpRecord.lastSentAt = now;
    otpRecord.lastIpAddress = ipAddress;
    otpRecord.isVerified = false;
    otpRecord.verifiedAt = null;
    otpRecord.registerAllowedUntil = null;

    await this.phoneOtpRepository.save(otpRecord);
    await this.smsService.sendOtp(phone, otpCode);
  }

  private async ensurePhoneIsAvailable(phone: string): Promise<void> {
    const existingUser = await this.usersService.findOneByPhone(phone);
    if (existingUser) {
      throw new BadRequestException('A user already exists with this phone number.');
    }
  }

  private async enforceIpThrottle(ipAddress: string): Promise<void> {
    const recentWindow = new Date(Date.now() - AuthenticationService.IP_WINDOW_MS);
    const recentRequests = await this.phoneOtpRepository.count({
      where: {
        lastIpAddress: ipAddress,
        lastSentAt: MoreThan(recentWindow),
      },
    });

    if (recentRequests >= AuthenticationService.IP_MAX_REQUESTS) {
      throw new BadRequestException('Too many OTP requests from this IP.');
    }
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
