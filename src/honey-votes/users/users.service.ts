import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosResponse } from 'axios';
import { Cache } from 'cache-manager';
import { FindConditions, FindOneOptions, Repository } from 'typeorm';
import { differenceInMinutes } from 'date-fns';
import { Mutex } from 'async-mutex';
// import { Commands, NoticeMessages } from 'twitch-js';
import { Config } from '../../config/config.interface';
import { TwitchApiService } from '../../twitch-api/twitch-api.service';
import { SubTier, TwitchUserType } from '../honey-votes.constants';
import { User } from './entities/user.entity';
import {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
  RefreshTokenResponse,
} from '../../twitch-api/twitch-api.interface';
// import { InjectChat } from '../../twitch-chat/twitch-chat.decorators';
// import { TWITCH_CHAT_ANONYMOUS } from '../../app.constants';
// import { TwitchChatService } from '../../twitch-chat/twitch-chat.service';
import { decrypt, encrypt } from '../../crypto/crypto';
import { UserRoles } from './users.interface';

type CheckUserTypesInput = {
  [TwitchUserType.Editor]?: boolean;
  [TwitchUserType.Mod]?: boolean;
  [TwitchUserType.Vip]?: boolean;
  [TwitchUserType.Sub]?: boolean;
  [TwitchUserType.Follower]?: boolean;
  subTierRequired?: SubTier;
  minutesToFollowRequired?: number;
};

type StoreUserInput = Pick<
  User,
  | 'id'
  | 'login'
  | 'displayName'
  | 'avatarUrl'
  | 'broadcasterType'
  | 'areTokensValid'
> & {
  credentials: {
    scope: string[];
    accessToken: string;
    refreshToken: string;
  };
};

type IsSub = [sub: boolean | null, tier: SubTier | null];
type IsFollower = [follower: boolean | null, minutesFollowed: number | null];

const SUB_TIER: Record<
  CheckUserSubscriptionResponse['data'][0]['tier'],
  SubTier
> = {
  '1000': SubTier.Tier1,
  '2000': SubTier.Tier2,
  '3000': SubTier.Tier3,
};

@Injectable()
export class UsersService {
  static CACHE_TTL = 60 * 10; // 10 minutes

  private static CACHE_KEY = {
    editors: (channelId: string) => `editors.${channelId}`,
    mods: (channelId: string) => `mods.${channelId}`,
    vips: (channelId: string) => `vips.${channelId}`,
    subs: (channelId: string, userId: string) => `subs.${channelId}-${userId}`,
    followers: (channelId: string, userId: string) =>
      `followers.${channelId}-${userId}`,
  };

  private readonly logger = new Logger(UsersService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly cryptoSecret: string;

  private readonly mutexes = new Map<string, Mutex>();

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly twitchApiService: TwitchApiService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache, // @InjectChat(TWITCH_CHAT_ANONYMOUS) // private readonly twitchChatService: TwitchChatService,
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

  async getUserRoles(
    userId: string,
    channelId?: string,
    channelLogin?: string,
  ): Promise<UserRoles> {
    if ((!channelId && !channelLogin) || (channelId && channelLogin)) {
      throw new BadRequestException();
    }

    const conditions: FindConditions<User> = {};

    if (channelId) conditions.id = channelId;
    if (channelLogin) conditions.login = channelLogin;

    const [user, channel] = await Promise.all([
      this.findOne(userId, { relations: ['credentials'] }),
      this.userRepo.findOne(conditions, { relations: ['credentials'] }),
    ]);

    if (!user || !channel) throw new NotFoundException();

    const [editor, mod, vip, [sub, tier], [follower, minutesFollowed]] =
      await Promise.all([
        this.isEditor(channel, user),
        this.isMod(channel, user),
        this.isVip(channel, user),
        this.isSub(channel, user),
        this.isFollower(channel, user),
      ]);

    return {
      broadcaster: user.id === channel.id,
      editor,
      mod,
      vip,
      sub,
      follower,
      minutesFollowed,
      subTier: tier,
    };
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

      if (accessToken) this.revokeToken(accessToken);
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
      credentials: {
        scope: user.credentials.scope,
        encryptedAccessToken,
        encryptedRefreshToken,
      },
    } as User);
  }

  decryptToken(token: string): string | null {
    try {
      return decrypt(token, this.cryptoSecret);
    } catch (e) {
      return null;
    }
  }

  async checkUserTypes(
    channel: User,
    user: User,
    types: CheckUserTypesInput = {},
  ): Promise<boolean> {
    const [editor, mod, vip, [sub, tier], [follower, minutesFollowed]] =
      await Promise.all([
        types.editor ? this.isEditor(channel, user) : undefined,
        types.mod ? this.isMod(channel, user) : undefined,
        types.vip ? this.isVip(channel, user) : undefined,
        types.sub ? this.isSub(channel, user) : ([null, null] as IsSub),
        types.follower
          ? this.isFollower(channel, user)
          : ([null, null] as IsFollower),
      ]);

    if (
      (follower && minutesFollowed >= types.minutesToFollowRequired) ||
      (sub && tier >= types.subTierRequired) ||
      vip ||
      mod ||
      editor
    ) {
      return true;
    }

    return false;
  }

  async isEditor(channel: User, user: User): Promise<boolean> {
    const key = UsersService.CACHE_KEY.editors(channel.id);
    const editorIds = await this.getCachedData(key, () =>
      this.getChannelEditors(channel),
    );

    return editorIds?.has(user.id);
  }

  async isMod(channel: User, user: User): Promise<boolean> {
    const key = UsersService.CACHE_KEY.mods(channel.id);
    const modIds = await this.getCachedData(key, () =>
      this.getChannelMods(channel),
    );

    return modIds?.has(user.id);
  }

  async isVip(channel: User, user: User): Promise<boolean> {
    /* const key = UsersService.CACHE_KEY.vips(channel.id);
    const vipIds = await this.getCachedData(key, () =>
      this.getChannelVips(channel.login),
    );

    return vipIds?.has(user.id); */

    return null;
  }

  isSub(channel: User, user: User): Promise<IsSub> {
    const key = UsersService.CACHE_KEY.subs(channel.id, user.id);

    return this.getCachedData(key, () => this.getIsSub(channel, user));
  }

  isFollower(channel: User, user: User): Promise<IsFollower | null> {
    const key = UsersService.CACHE_KEY.followers(channel.id, user.id);

    return this.getCachedData(key, () => this.getIsFollower(channel, user));
  }

  private async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T | null> {
    let data = await this.cache.get<T>(key);

    if (data) return data;

    try {
      data = await fetcher();

      this.cache.set<T>(key, data);

      return data;
    } catch (e) {
      return null;
    }
  }

  async getIsSub(channel: User, user: User): Promise<IsSub> {
    if (!user.areTokensValid) {
      this.logger.log(
        `isSub: areTokensValid === false. User: ${channel.login}`,
      );

      return [null, null];
    }

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
          this.logger.log(`isSub: invalid access token. User: ${user.login}`);

          const updatedUser = await this.smartRefreshToken(user);

          if (updatedUser === null) return [null, null];

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else if (e.response.status === 404) {
          return [false, null];
        } else {
          this.logger.error(
            `isSub: unknown error. User: ${user.login}`,
            e.stack,
          );

          return [null, null];
        }
      }
    }

    const tier = SUB_TIER[response.data.data[0].tier];

    return [true, tier];
  }

  // TODO: if user token not valid take channel token
  async getIsFollower(channel: User, user: User): Promise<IsFollower> {
    if (!user.areTokensValid) {
      this.logger.log(
        `isFollower: areTokensValid === false. User: ${channel.login}`,
      );

      return [null, null];
    }

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
          this.logger.log(
            `isFollower: invalid access token. User: ${user.login}`,
          );

          const updatedUser = await this.smartRefreshToken(user);

          if (updatedUser === null) {
            return [null, null];
          }

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          this.logger.error(
            `isFollower: unknown error. User: ${user.login}`,
            e.stack,
          );

          return [null, null];
        }
      }
    }

    if (response.data.total === 0) {
      return [false, null];
    }

    const followedAt = new Date(response.data.data[0].followed_at);
    const minutesFollowed = differenceInMinutes(new Date(), followedAt);

    return [true, minutesFollowed];
  }

  async getChannelEditors(channel: User): Promise<Set<string>> {
    if (!channel.areTokensValid) {
      this.logger.log(
        `getChannelEditors: areTokensValid === false. User: ${channel.login}`,
      );

      throw new UnauthorizedException();
    }

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
          this.logger.log(
            `getChannelEditors: invalid access token. User: ${channel.login}`,
          );

          const updatedUser = await this.smartRefreshToken(channel);

          if (updatedUser === null) throw new UnauthorizedException();

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          this.logger.error(
            `getChannelEditors: unknown error. User: ${channel.login}`,
            e.stack,
          );

          return new Set();
        }
      }
    }

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelMods(channel: User): Promise<Set<string>> {
    if (!channel.areTokensValid) {
      this.logger.log(
        `getChannelMods: areTokensValid === false. User: ${channel.login}`,
      );

      throw new UnauthorizedException();
    }

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
          this.logger.log(
            `getChannelMods: invalid access token. User: ${channel.login}`,
          );

          const updatedUser = await this.smartRefreshToken(channel);

          if (updatedUser === null) throw new UnauthorizedException();

          accessToken = this.decryptToken(
            updatedUser.credentials.encryptedAccessToken,
          );
        } else {
          this.logger.error(
            `getChannelMods: unknown error. User: ${channel.login}`,
            e.stack,
          );

          return new Set();
        }
      }
    }

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelVips(channel: string): Promise<Set<string>> {
    /* const GET_VIPS_TIMEOUT = 5000;
    const off = (f: any) => this.twitchChatService.chat.off(Commands.NOTICE, f);

    const parseVips = (notice: any): Set<string> => {
      if (notice.event === 'NO_VIPS') return new Set();
      if (notice.event === 'VIPS_SUCCESS') {
        const vips = notice.message
          .slice(0, -1)
          .split(':')[1]
          .split(', ')
          .map((n) => n.toLowerCase());
        return new Set<string>(vips);
      }
      return new Set();
    };

    return new Promise((resolve) => {
      const fn = (notice: NoticeMessages) => {
        if (notice.channel.slice(1) === channel) {
          resolve(parseVips(notice));
          off(fn);
          return;
        }

        setTimeout(() => {
          resolve(new Set());
          off(fn);
        }, GET_VIPS_TIMEOUT);
      };

      this.twitchChatService.chat.on(Commands.NOTICE, fn);
      this.twitchChatService.say(channel, '/vips');
    }); */

    return new Set();
  }

  private async revokeToken(accessToken: string) {
    try {
      return await this.twitchApiService.revokeToken({
        token: accessToken,
        client_id: this.clientId,
      });
    } catch (e) {}
  }

  private async smartRefreshToken(user: User): Promise<User | null> {
    let mutex = this.mutexes.get(user.id);
    let result: User;

    if (mutex) {
      await mutex.waitForUnlock();
    } else {
      mutex = new Mutex();
      this.mutexes.set(user.id, mutex);
      const release = await mutex.acquire();

      try {
        result = await this.refreshToken(user);
      } finally {
        release();
      }

      this.mutexes.delete(user.id);
    }

    return result;
  }

  /**
   * Try to refresh tokens and write them to the db
   * @returns null if refresh failed
   * @returns the updated user if refresh succeeded
   */
  private async refreshToken(user: User): Promise<User | null> {
    const refreshToken = this.decryptToken(
      user.credentials.encryptedRefreshToken,
    );
    let response: AxiosResponse<RefreshTokenResponse>;

    try {
      response = await this.twitchApiService.refreshToken({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
    } catch (e) {
      if (e.response.status === 400) {
        await this.store({
          ...user,
          credentials: { accessToken: '', refreshToken: '', scope: [] },
          areTokensValid: false,
        });

        this.logger.log(
          `refreshToken: Failed. User: ${user.login}. ${e.response.data?.message}`,
        );

        return null;
      }
    }

    const newUser = await this.store({
      ...user,
      credentials: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        scope: response.data.scope,
      },
      areTokensValid: true,
    });

    this.logger.log(`refreshToken: Success. User: ${user.login}`);

    return newUser;
  }
}
