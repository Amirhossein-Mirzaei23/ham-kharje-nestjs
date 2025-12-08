import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your_jwt_secret_here', // از ConfigModule بخوانی بهتره
    });
  }

  async validate(payload: any) {
    // هر چیزی return کنی وارد req.user می‌شود
    return { id: payload.id, phone: payload.phone };
  }
}
