import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationService } from './authentication.service';
import { AuthController } from './authentication.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { Authentication } from './entities/authentication.entity';
import { PhoneOtp } from './entities/phone-otp.entity';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { SmsService } from './services/sms.service';
import { HttpModule } from '@nestjs/axios';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([PhoneOtp,User]),
    UsersModule,
    WalletModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthenticationService, JwtStrategy, SmsService],
  exports: [SmsService],
})
export class AuthModule {}
