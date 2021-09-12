import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosResponse } from 'axios';
import { FindOneOptions, Repository } from 'typeorm';
import { differenceInMinutes } from 'date-fns';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { Config } from '../../config/config.interface';
import { TwitchApiService } from '../../twitch-api/twitch-api.service';
import { SubTier, TwitchUserType } from '../honey-votes.interface';
import { User } from './entities/User.entity';
import { UserCredentials } from './entities/UserCredentials.entity';
import {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
  RefreshTokenResponse,
} from '../../twitch-api/twitch-api.interface';
import { decrypt, encrypt } from '../../crypto/crypto';

type CheckUserTypesInput = {
  [TwitchUserType.Editor]?: boolean;
  [TwitchUserType.Mod]?: boolean;
  [TwitchUserType.Vip]?: boolean;
  [TwitchUserType.SubTier1]?: boolean;
  [TwitchUserType.SubTier2]?: boolean;
  [TwitchUserType.SubTier3]?: boolean;
  [TwitchUserType.Follower]?: boolean;
  minutesToFollowRequired?: number;
};

type StoreUserInput = Pick<User, 'id' | 'login' | 'displayName' | 'avatarUrl'> &
  Partial<Pick<User, 'areTokensValid'>> & {
    credentials: { accessToken: string; refreshToken: string };
  };

@Injectable()
export class UsersService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly cryptoSecret: string;

  // TODO: cache requests
  // private readonly editorIds = new Map<string, Set<string>>();
  // private readonly modIds = new Map<string, Set<string>>();
  // private readonly vipIds = new Map<string, Set<string>>();

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(User, POSTGRES_CONNECTION)
    private readonly userRepo: Repository<User>,
    private readonly twitchApiService: TwitchApiService,
  ) {
    this.clientId = configService.get<string>('HONEY_VOTES_TWITCH_CLIENT_ID');
    this.clientSecret = configService.get<string>(
      'HONEY_VOTES_TWITCH_CLIENT_SECRET',
    );
    this.cryptoSecret = this.configService.get('HONEY_VOTES_CRYPTO_SECRET', {
      infer: true,
    });
  }

  async getChannelByLogin(login: string): Promise<User> {
    const channel = await this.userRepo.findOne({ where: { login } });

    if (!channel) throw new NotFoundException();

    return channel;
  }

  async getChannelById(id: string): Promise<User> {
    const channel = await this.userRepo.findOne(id);

    if (!channel) throw new NotFoundException();

    return channel;
  }

  async findOne(
    userId: string,
    options?: FindOneOptions<User>,
  ): Promise<User | null> {
    const user = await this.userRepo.findOne(userId, options);

    if (!user) return null;

    return user;
  }

  async findOneOrFail(
    userId: string,
    options?: FindOneOptions<User>,
  ): Promise<User> {
    return this.userRepo.findOneOrFail(userId, options);
  }

  async store(user: StoreUserInput) {
    const dbUser = await this.findOne(user.id, { relations: ['credentials'] });

    if (dbUser?.credentials?.encryptedAccessToken) {
      const accessToken = this.decryptToken(
        dbUser.credentials.encryptedAccessToken,
      );

      if (accessToken) await this.revokeToken(accessToken);
    }

    const {
      credentials: { accessToken, refreshToken },
      ...rest
    } = user;

    const encryptedAccessToken = accessToken
      ? encrypt(accessToken, this.cryptoSecret)
      : '';
    const encryptedRefreshToken = refreshToken
      ? encrypt(refreshToken, this.cryptoSecret)
      : '';

    return this.userRepo.save({
      ...rest,
      credentials: { encryptedAccessToken, encryptedRefreshToken },
    } as User);
  }

  decryptToken(token: string) {
    return decrypt(token, this.cryptoSecret);
  }

  async checkUserTypes(
    channel: User,
    user: User,
    types: CheckUserTypesInput = {},
  ): Promise<boolean> {
    const sub = types.subTier1 || types.subTier2 || types.subTier3;

    const [
      isEditor,
      isMod,
      isVip,
      { isSub, tier },
      { isFollower, minutesFollowed },
    ] = await Promise.all([
      types.editor ? this.isEditor(channel, user) : undefined,
      types.mod ? this.isMod(channel, user) : undefined,
      types.vip ? this.isVip(channel, user) : undefined,
      sub ? this.isSub(channel, user) : { isSub: false, tier: SubTier.t1 },
      types.follower
        ? this.isFollower(channel, user)
        : { isFollower: false, minutesFollowed: 0 },
    ]);

    if (
      (isFollower && minutesFollowed >= types.minutesToFollowRequired) ||
      (isSub && types.subTier1 && tier === SubTier.t1) ||
      (isSub && types.subTier2 && tier === SubTier.t2) ||
      (isSub && types.subTier3 && tier === SubTier.t3) ||
      isVip ||
      isMod ||
      isEditor
    ) {
      return true;
    }

    return false;
  }

  async isEditor(channel: User, user: User): Promise<boolean> {
    const editorIds = await this.getChannelEditors(channel);

    return editorIds.has(user.id);
  }

  async isMod(channel: User, user: User): Promise<boolean> {
    const modIds = await this.getChannelMods(channel);

    return modIds.has(user.id);
  }

  async isVip(channel: User, user: User): Promise<boolean> {
    const vipIds = await this.getChannelVips(channel.id);

    return vipIds.has(user.id);
  }

  async isSub(
    channel: User,
    user: User,
  ): Promise<{ isSub: boolean; tier?: SubTier }> {
    if (!user.areTokensValid) throw new UnauthorizedException();

    let response: AxiosResponse<CheckUserSubscriptionResponse>;
    let accessToken = this.decryptToken(user.credentials.encryptedAccessToken);

    // TODO: remove loops or add iteration limit
    while (true) {
      try {
        response = await this.twitchApiService.checkUserSubscription(
          { broadcaster_id: channel.id, user_id: user.id },
          { clientId: this.clientId, accessToken },
        );

        break;
      } catch (e) {
        if (e.response.status === 401) {
          const updatedUser = await this.refreshToken(user);

          if (updatedUser === null) throw new UnauthorizedException();

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          return { isSub: false };
        }
      }
    }

    const tier = response.data.data[0].tier as SubTier;

    return { isSub: true, tier };
  }

  // TODO: if user token not valid take channel token
  async isFollower(
    channel: User,
    user: User,
  ): Promise<{ isFollower: boolean; minutesFollowed?: number }> {
    if (!user.areTokensValid) throw new UnauthorizedException();

    let response: AxiosResponse<GetUserFollowsResponse>;
    let accessToken = this.decryptToken(user.credentials.encryptedAccessToken);

    while (true) {
      try {
        response = await this.twitchApiService.getUserFollows(
          { from_id: user.id, to_id: channel.id },
          { clientId: this.clientId, accessToken },
        );

        break;
      } catch (e) {
        if (e.response.status === 401) {
          const updatedUser = await this.refreshToken(user);

          if (updatedUser === null) throw new UnauthorizedException();

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          return { isFollower: false };
        }
      }
    }

    if (response.data.total === 0) return { isFollower: false };

    const followedAt = new Date(response.data.data[0].followed_at);
    const minutesFollowed = differenceInMinutes(new Date(), followedAt);

    return { isFollower: true, minutesFollowed };
  }

  async getChannelEditors(channel: User): Promise<Set<string>> {
    if (!channel.areTokensValid) throw new UnauthorizedException();

    let response: AxiosResponse<GetChannelEditorsResponse>;
    let accessToken = this.decryptToken(
      channel.credentials.encryptedAccessToken,
    );

    while (true) {
      try {
        response = await this.twitchApiService.getChannelEditors(channel.id, {
          clientId: this.clientId,
          accessToken,
        });

        break;
      } catch (e) {
        if (e.response.status === 401) {
          const updatedUser = await this.refreshToken(channel);

          if (updatedUser === null) throw new UnauthorizedException();

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          return new Set();
        }
      }
    }

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelMods(channel: User): Promise<Set<string>> {
    if (!channel.areTokensValid) throw new UnauthorizedException();

    let response: AxiosResponse<GetModeratorsResponse>;
    let accessToken = this.decryptToken(
      channel.credentials.encryptedAccessToken,
    );

    while (true) {
      try {
        response = await this.twitchApiService.getModerators(channel.id, {
          clientId: this.clientId,
          accessToken,
        });

        break;
      } catch (e) {
        if (e.response.status === 401) {
          const updatedUser = await this.refreshToken(channel);

          if (updatedUser === null) throw new UnauthorizedException();

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          return new Set();
        }
      }
    }

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelVips(channelId: string): Promise<Set<string>> {
    return new Set();
  }

  private async revokeToken(accessToken: string) {
    // TODO: don't await this operation?
    console.log('revokeToken', accessToken);

    const response = await this.twitchApiService.revokeToken({
      token: accessToken,
      client_id: this.clientId,
    });

    console.log('revokeToken', response);
  }

  /**
   * Try to refresh tokens and write them to the db
   * @returns null if refresh failed
   * @returns the updated user if refresh succeeded
   */
  private async refreshToken(user: User): Promise<User | null> {
    let response: AxiosResponse<RefreshTokenResponse>;

    try {
      response = await this.twitchApiService.refreshToken({
        refresh_token: user.credentials.encryptedRefreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
    } catch (e) {
      if (e.response.status === 400) {
        await this.store({
          ...user,
          credentials: { accessToken: '', refreshToken: '' },
          areTokensValid: false,
        });

        return null;
      }
    }

    const newUser = await this.store({
      ...user,
      credentials: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      },
      areTokensValid: true,
    });

    return newUser;
  }
}
