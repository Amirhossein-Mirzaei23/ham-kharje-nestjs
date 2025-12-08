import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationService } from './authentication.service';
import { AuthController } from './authentication.controller';
import { JwtModule } from '@nestjs/jwt';
import { Authentication } from './entities/authentication.entity';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Authentication]),
    UsersModule,
    JwtModule.register({
      secret: "MY_SUPER_SECRET_KEY",
      signOptions: { expiresIn: "7d" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthenticationService,JwtStrategy],
})
export class AuthModule {}
