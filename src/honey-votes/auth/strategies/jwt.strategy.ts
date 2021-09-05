import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Config } from '../../../config/config.interface';
import { JwtPayload, JwtStrategyUser } from '../auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService<Config>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('HONEY_VOTES_ACCESS_TOKEN_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtStrategyUser {
    if (!payload) throw new UnauthorizedException();

    return { id: payload.sub, login: payload.sub };
  }
}
