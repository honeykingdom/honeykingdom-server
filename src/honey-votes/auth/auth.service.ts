import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Config } from '../../config/config.interface';
import { BroadcasterType } from '../honey-votes.constants';
import { UsersService } from '../users/users.service';
import {
  JwtPayload,
  RefreshTokenResponse,
  TwitchStrategyUser,
} from './auth.interface';

type JwtTokenSignOptions = Required<
  Pick<JwtSignOptions, 'secret' | 'expiresIn'>
>;

@Injectable()
export class AuthService {
  private readonly accessTokenSignOptions: JwtTokenSignOptions;
  private readonly refreshTokenSignOptions: JwtTokenSignOptions;
  private readonly frontendBaseUrl: string;

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
    this.frontendBaseUrl = configService.get<string>(
      'HONEY_VOTES_FRONTEND_BASE_URL',
    );
  }

  async twitchRedirect(user: TwitchStrategyUser): Promise<string> {
    const tokens = await this.getTokens(user);

    if (!tokens) throw new InternalServerErrorException();

    const { accessToken, refreshToken } = tokens;

    return `${this.frontendBaseUrl}/#accessToken=${accessToken}&refreshToken=${refreshToken}`;
  }

  private async getTokens(
    user: TwitchStrategyUser,
  ): Promise<RefreshTokenResponse | null> {
    if (!user) return null;

    const {
      id,
      scope,
      accessToken,
      refreshToken,
      login,
      displayName,
      broadcaster_type: broadcasterType,
      profile_image_url: avatarUrl,
    } = user;

    await this.usersService.store({
      id,
      login,
      displayName,
      avatarUrl,
      credentials: { accessToken, refreshToken, scope },
      broadcasterType: broadcasterType as BroadcasterType,
      areTokensValid: true,
    });

    return this.signTokens({ sub: id, login });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    let refreshTokenPayload: JwtPayload;

    try {
      refreshTokenPayload = this.jwtService.verify<JwtPayload>(
        refreshToken,
        this.refreshTokenSignOptions,
      );
    } catch (e) {
      throw new BadRequestException();
    }

    const user = await this.usersService.findOne(refreshTokenPayload.sub);

    if (!user) throw new BadRequestException();

    return this.signTokens({ sub: user.id, login: user.login });
  }

  private signTokens(payload: JwtPayload): RefreshTokenResponse {
    return {
      accessToken: this.jwtService.sign(payload, this.accessTokenSignOptions),
      refreshToken: this.jwtService.sign(payload, this.refreshTokenSignOptions),
    };
  }
}
