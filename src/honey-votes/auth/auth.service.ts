import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Config } from '../../config/config.interface';
import { UsersService } from '../users/users.service';
import {
  JwtPayload,
  TwitchLoginResponse,
  TwitchStrategyUser,
} from './auth.interface';

type JwtTokenSignOptions = Required<
  Pick<JwtSignOptions, 'secret' | 'expiresIn'>
>;

@Injectable()
export class AuthService {
  private readonly accessTokenSignOptions: JwtTokenSignOptions;
  private readonly refreshTokenSignOptions: JwtTokenSignOptions;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {
    this.accessTokenSignOptions = {
      secret: configService.get<string>('HONEY_VOTES_ACCESS_TOKEN_SECRET'),
      expiresIn: configService.get<string>(
        'HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME',
      ),
    };
    this.refreshTokenSignOptions = {
      secret: configService.get<string>('HONEY_VOTES_REFRESH_TOKEN_SECRET'),
      expiresIn: configService.get<string>(
        'HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME',
      ),
    };
  }

  async twitchLogin(
    user: TwitchStrategyUser,
  ): Promise<TwitchLoginResponse | null> {
    if (!user) return null;

    const {
      id,
      accessToken,
      refreshToken,
      login,
      displayName,
      profile_image_url: avatarUrl,
    } = user;

    await this.usersService.store({
      id,
      login,
      displayName,
      avatarUrl,
      credentials: { accessToken, refreshToken },
    });

    return this.signTokens({ sub: id, login });
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<TwitchLoginResponse> {
    const user = await this.usersService.findOne(userId);

    if (!user) throw new BadRequestException();

    let refreshTokenPayload: JwtPayload;

    try {
      refreshTokenPayload = this.jwtService.verify<JwtPayload>(
        refreshToken,
        this.refreshTokenSignOptions,
      );
    } catch (e) {
      throw new BadRequestException();
    }

    if (refreshTokenPayload.sub !== user.id) throw new BadRequestException();

    return this.signTokens({ sub: user.id, login: user.login });
  }

  getUser(userId: string) {
    return this.usersService.findOne(userId);
  }

  private signTokens(payload: JwtPayload): TwitchLoginResponse {
    return {
      accessToken: this.jwtService.sign(payload, this.accessTokenSignOptions),
      refreshToken: this.jwtService.sign(payload, this.refreshTokenSignOptions),
    };
  }
}
