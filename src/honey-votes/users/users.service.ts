import {
  BadRequestException,
  CACHE_MANAGER,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import { differenceInMinutes } from 'date-fns';
import { Config } from '../../config/config.interface';
import { TwitchApiService } from '../../twitch-api/twitch-api.service';
import { SubTier, TwitchUserType } from '../honey-votes.constants';
import { User } from './entities/user.entity';
import { CheckUserSubscriptionResponse } from '../../twitch-api/twitch-api.interface';
import { decrypt, encrypt } from '../../crypto/crypto';
import { StoreUserCredentials, UserRoles } from './users.interface';

type Permissions = {
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

const EMPTY_TOKEN = '';

type UserRolesClaims = {
  editor: boolean;
  mod: boolean;
  vip: boolean;
  sub: boolean;
  follower: boolean;
};

const USER_ROLES_ALL_CLAIMS: UserRolesClaims = {
  editor: true,
  mod: true,
  vip: true,
  sub: true,
  follower: true,
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

  private readonly refreshingTokens = new Map<string, Promise<string>>();

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly twitchApi: TwitchApiService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.clientId = configService.get<string>('HONEY_VOTES_TWITCH_CLIENT_ID');
    this.clientSecret = configService.get<string>(
      'HONEY_VOTES_TWITCH_CLIENT_SECRET',
    );
    this.cryptoSecret = this.configService.get('HONEY_VOTES_CRYPTO_SECRET', {
      infer: true,
    });
  }

  async findByLogin(login: string): Promise<User> {
    const channel = await this.userRepo.findOneBy({ login });

    if (!channel) throw new NotFoundException();

    return channel;
  }

  async findById(id: string): Promise<User> {
    const channel = await this.userRepo.findOneBy({ id });

    if (!channel) throw new NotFoundException();

    return channel;
  }

  async findOne(options: FindOneOptions<User>): Promise<User | null> {
    const user = await this.userRepo.findOne(options);

    if (!user) return null;

    return user;
  }

  async findOneBy(
    where: FindOptionsWhere<User> | FindOptionsWhere<User>[],
  ): Promise<User | null> {
    const user = await this.userRepo.findOneBy(where);

    if (!user) return null;

    return user;
  }

  async store(user: StoreUserInput) {
    const dbUser = await this.findOne({
      where: { id: user.id },
      relations: { credentials: true },
    });

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

  async userRoles(
    userId: string,
    channelId?: string,
    channelLogin?: string,
    claims = USER_ROLES_ALL_CLAIMS,
  ): Promise<UserRoles> {
    if ((!channelId && !channelLogin) || (channelId && channelLogin)) {
      throw new BadRequestException();
    }

    const where: FindOneOptions<User>['where'] = {};

    if (channelId) where.id = channelId;
    if (channelLogin) where.login = channelLogin;

    const [user, channel] = await Promise.all([
      this.findOne({ where: { id: userId }, relations: { credentials: true } }),
      this.userRepo.findOne({ where, relations: { credentials: true } }),
    ]);

    if (!user || !channel) throw new NotFoundException();

    return this.getUserRoles(channel, user, claims);
  }

  async isHasPermissions(
    channel: User,
    user: User,
    p: Permissions = {},
  ): Promise<boolean> {
    const claims: UserRolesClaims = {
      editor: p.editor,
      mod: p.mod,
      vip: p.vip,
      sub: p.sub,
      follower: p.follower,
    };

    const roles = await this.getUserRoles(channel, user, claims);

    if (
      (roles.follower && roles.minutesFollowed >= p.minutesToFollowRequired) ||
      (roles.sub && roles.subTier >= p.subTierRequired) ||
      roles.vip ||
      roles.mod ||
      roles.editor
    ) {
      return true;
    }

    return false;
  }

  private async getUserRoles(
    channel: User,
    user: User,
    claims: UserRolesClaims,
  ): Promise<UserRoles> {
    const getChannelTokenPromises = (
      { editor, mod, vip }: UserRolesClaims,
      channelToken: string,
    ) =>
      [
        editor ? this.getChannelEditors(channel.id, channelToken) : null,
        mod ? this.getChannelMods(channel.id, channelToken) : null,
        vip ? this.getChannelVips(channel.id, channelToken) : null,
      ] as const;

    const getUserTokenPromises = (
      { sub, follower }: UserRolesClaims,
      userToken: string,
    ) =>
      [
        sub ? this.isSub(channel.id, user.id, userToken) : null,
        follower ? this.isFollower(channel.id, user.id, userToken) : null,
      ] as const;

    const userRoles: UserRoles = {
      broadcaster: channel.id === user.id,
      editor: null,
      mod: null,
      vip: null,
      sub: null,
      follower: null,
      minutesFollowed: null,
      subTier: null,
    };

    const makeRequestsWithChannelAccessToken = async (roles: UserRoles) => {
      if (channel.areTokensValid) {
        let channelToken = this.decryptToken(
          channel.credentials.encryptedAccessToken,
        );

        for await (const i of Array(2).keys()) {
          if (!channelToken) break;

          try {
            const [editors, mods, vips] = await Promise.all(
              getChannelTokenPromises(claims, channelToken),
            );

            roles.editor = editors ? editors.has(user.id) : null;
            roles.mod = mods ? mods.has(user.id) : null;
            roles.vip = vips ? vips.has(user.id) : null;

            break;
          } catch (e) {
            if (e instanceof UnauthorizedException) {
              channelToken = await this.refreshAndStoreUserToken(channel);
            } else {
              channelToken = EMPTY_TOKEN;
            }
          }
        }
      } else {
        this.logger.log(`Invalid tokens: ${channel.login}`);
      }
    };

    const makeRequestsWithUserAccessToken = async (roles: UserRoles) => {
      if (user.areTokensValid) {
        let userToken = this.decryptToken(
          user.credentials.encryptedAccessToken,
        );

        for await (const i of Array(2).keys()) {
          if (!userToken) break;

          try {
            const [isSubResponse, isFollowerResponse] = await Promise.all(
              getUserTokenPromises(claims, userToken),
            );

            if (isSubResponse) {
              const [isSub, subTier] = isSubResponse;
              roles.sub = isSub;
              roles.subTier = subTier;
            }

            if (isFollowerResponse) {
              const [isFollower, minutesFollowed] = isFollowerResponse;
              roles.follower = isFollower;
              roles.minutesFollowed = minutesFollowed;
            }

            break;
          } catch (e) {
            if (e instanceof UnauthorizedException) {
              userToken = await this.refreshAndStoreUserToken(user);
            } else {
              userToken = EMPTY_TOKEN;
            }
          }
        }
      } else {
        this.logger.log(`Invalid tokens: ${user.login}`);
      }
    };

    await Promise.all([
      makeRequestsWithChannelAccessToken(userRoles),
      makeRequestsWithUserAccessToken(userRoles),
    ]);

    return userRoles;
  }

  private async isSub(
    channelId: string,
    userId: string,
    userAccessToken: string,
  ): Promise<IsSub> {
    const key = UsersService.CACHE_KEY.subs(channelId, userId);
    let isSub = await this.cache.get<IsSub>(key);
    if (isSub) return isSub;

    try {
      const response = await this.twitchApi.checkUserSubscription(
        { broadcaster_id: channelId, user_id: userId },
        { clientId: this.clientId, accessToken: userAccessToken },
      );

      const tier = SUB_TIER[response.data.data[0].tier];

      isSub = [true, tier];
    } catch (e) {
      if (e.response.status === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException();
      } else if (e.response.status === HttpStatus.NOT_FOUND) {
        isSub = [false, null];
      } else {
        isSub = [null, null];
      }
    }

    this.cache.set(key, isSub);
    return isSub;
  }

  private async isFollower(
    channelId: string,
    userId: string,
    userAccessToken: string,
  ): Promise<IsFollower> {
    const key = UsersService.CACHE_KEY.followers(channelId, userId);
    let isFollower = await this.cache.get<IsFollower>(key);
    if (isFollower) return isFollower;

    try {
      const response = await this.twitchApi.getChannelFollowers(
        { user_id: userId, broadcaster_id: channelId },
        { clientId: this.clientId, accessToken: userAccessToken },
      );

      if (response.data.total === 0) return [false, null];

      const followedAt = new Date(response.data.data[0].followed_at);
      const minutesFollowed = differenceInMinutes(new Date(), followedAt);

      isFollower = [true, minutesFollowed];
    } catch (e) {
      if (e.response.status === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException();
      } else {
        isFollower = [null, null];
      }
    }

    this.cache.set(key, isFollower);
    return isFollower;
  }

  private async getChannelEditors(
    channelId: string,
    channelAccessToken: string,
  ): Promise<Set<string>> {
    const key = UsersService.CACHE_KEY.editors(channelId);
    let editors = await this.cache.get<Set<string>>(key);

    try {
      const response = await this.twitchApi.getChannelEditors(channelId, {
        clientId: this.clientId,
        accessToken: channelAccessToken,
      });

      editors = new Set(response.data.data.map((u) => u.user_id));
    } catch (e) {
      if (e.response.status === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException();
      } else {
        editors = new Set();
      }
    }

    this.cache.set(key, editors);
    return editors;
  }

  private async getChannelMods(
    channelId: string,
    channelAccessToken: string,
  ): Promise<Set<string>> {
    const key = UsersService.CACHE_KEY.mods(channelId);
    let mods = await this.cache.get<Set<string>>(key);
    if (mods) return mods;

    try {
      const response = await this.twitchApi.getModerators(channelId, {
        clientId: this.clientId,
        accessToken: channelAccessToken,
      });

      mods = new Set(response.data.data.map((u) => u.user_id));
    } catch (e) {
      if (e.response.status === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException();
      } else {
        mods = new Set();
      }
    }

    this.cache.set(key, mods);
    return mods;
  }

  private async getChannelVips(
    channelId: string,
    channelAccessToken: string,
  ): Promise<Set<string>> {
    const key = UsersService.CACHE_KEY.vips(channelId);
    let vips = await this.cache.get<Set<string>>(key);

    try {
      const response = await this.twitchApi.getVips(channelId, {
        clientId: this.clientId,
        accessToken: channelAccessToken,
      });

      vips = new Set(response.data.data.map((u) => u.user_id));
    } catch (e) {
      if (e.response.status === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException();
      } else {
        vips = new Set();
      }
    }

    this.cache.set(key, vips);
    return vips;
  }

  private async revokeToken(accessToken: string) {
    try {
      return await this.twitchApi.revokeToken({
        token: accessToken,
        client_id: this.clientId,
      });
    } catch (e) {}
  }

  private async refreshAndStoreUserToken(user: User): Promise<string> {
    let refreshingTokenPromise = this.refreshingTokens.get(user.id);

    if (refreshingTokenPromise) return refreshingTokenPromise;

    refreshingTokenPromise = (async () => {
      try {
        const refreshToken = this.decryptToken(
          user.credentials.encryptedRefreshToken,
        );
        const credentials = await this.refreshToken(refreshToken);

        this.logger.log(`refreshUserToken success: ${user.login}`);

        await this.store({
          ...user,
          credentials,
          areTokensValid: true,
        });

        return credentials.accessToken;
      } catch (e) {
        this.logger.error(`refreshUserToken failed: ${user.login} ${e}`);

        await this.store({
          ...user,
          credentials: {
            accessToken: EMPTY_TOKEN,
            refreshToken: EMPTY_TOKEN,
            scope: [],
          },
          areTokensValid: false,
        });

        return EMPTY_TOKEN;
      }
    })();

    this.refreshingTokens.set(user.id, refreshingTokenPromise);
    const newToken = await refreshingTokenPromise;
    this.refreshingTokens.delete(user.id);

    return newToken;
  }

  private async refreshToken(
    refreshToken: string,
  ): Promise<StoreUserCredentials | null> {
    const response = await this.twitchApi.refreshToken({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      scope: response.data.scope,
    };
  }
}
