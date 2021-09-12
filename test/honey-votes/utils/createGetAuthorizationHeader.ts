import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Config } from '../../../src/config/config.interface';
import { signAccessToken, SignTokenOptions } from './auth';
import { MockUser } from './users';

export const createGetAuthorizationHeader =
  (jwtService: JwtService, configService: ConfigService<Config>) =>
  (
    { id, login }: Pick<MockUser, 'id' | 'login'>,
    signTokenOptions?: SignTokenOptions,
  ) => {
    return [
      'Authorization',
      `Bearer ${signAccessToken(
        { sub: id, login },
        jwtService,
        configService,
        signTokenOptions,
      )}`,
    ] as const;
  };
