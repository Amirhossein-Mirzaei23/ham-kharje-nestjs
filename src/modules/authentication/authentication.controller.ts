import { Body, Controller, Ip, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticationService } from './authentication.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('otp/send')
  sendOtp(@Body() payload: SendOtpDto, @Ip() ipAddress: string) {
    return this.authService.sendOtp(payload, ipAddress);
  }

  @Post('otp/resend')
  resendOtp(@Body() payload: SendOtpDto, @Ip() ipAddress: string) {
    return this.authService.resendOtp(payload, ipAddress);
  }

  @Post('otp/confirm')
  confirmOtp(@Body() payload: ConfirmOtpDto) {
    return this.authService.confirmOtp(payload);
  }

  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }
}
