import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Config } from '../../../src/config/config.interface';
import { JwtPayload } from '../../../src/honey-votes/auth/auth.interface';

export type SignTokenOptions = { expired: boolean };
const signTokenDefaultOptions = { expired: false };

export const signAccessToken = (
  payload: JwtPayload,
  jwtService: JwtService,
  configService: ConfigService<Config>,
  { expired }: SignTokenOptions = signTokenDefaultOptions,
) => {
  const secret = configService.get('HONEY_VOTES_ACCESS_TOKEN_SECRET', {
    infer: true,
  });
  const expiresIn = configService.get('HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME', {
    infer: true,
  });

  return jwtService.sign(payload, {
    secret,
    expiresIn: `${expired ? '-' : ''}${expiresIn}`,
  });
};

export const signRefreshToken = (
  payload: JwtPayload,
  jwtService: JwtService,
  configService: ConfigService<Config>,
  { expired }: SignTokenOptions = signTokenDefaultOptions,
) => {
  const secret = configService.get('HONEY_VOTES_REFRESH_TOKEN_SECRET', {
    infer: true,
  });
  const expiresIn = configService.get('HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME', {
    infer: true,
  });

  return jwtService.sign(payload, {
    secret,
    expiresIn: `${expired ? '-' : ''}${expiresIn}`,
  });
};
