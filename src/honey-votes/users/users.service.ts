import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosResponse } from 'axios';
import { Repository } from 'typeorm';
import { differenceInMinutes } from 'date-fns';
import ms from 'ms';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { Config } from '../../config/config.interface';
import { TwitchApiService } from '../../twitch-api/twitch-api.service';
import { SubTier, TwitchUserType } from '../honey-votes.interface';
import { User } from './entities/User.entity';
import {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
  RefreshTokenResponse,
} from '../../twitch-api/twitch-api.interface';

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

@Injectable()
export class UsersService {
  private readonly clientId: string;
  private readonly clientSecret: string;

  // TODO: cache requests
  // private readonly twitchRevalidateInterval = ms('5m');
  // private readonly editorIds = new Map<string, Set<string>>();
  // private readonly modIds = new Map<string, Set<string>>();
  // private readonly vipIds = new Map<string, Set<string>>();

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(User, POSTGRES_CONNECTION)
    private readonly userRepo: Repository<User>,
    // private readonly httpService: HttpService,
    private readonly twitchApiService: TwitchApiService,
  ) {
    this.clientId = configService.get<string>('HONEY_VOTES_TWITCH_CLIENT_ID');
    this.clientSecret = configService.get<string>(
      'HONEY_VOTES_TWITCH_CLIENT_SECRET',
    );
  }

  async findOne(userId: string): Promise<User | null> {
    const user = await this.userRepo.findOne(userId);

    if (!user) return null;

    return user;
  }

  async findOneOrFail(userId: string): Promise<User> {
    return this.userRepo.findOneOrFail(userId);
  }

  // async findMany(userIds: string[]): Promise<User[]> {
  //   const users = await this.userRepo.find({ where: { id: In(userIds) } });

  //   return users;
  // }

  async store(
    user: Pick<
      User,
      | 'id'
      | 'accessToken'
      | 'refreshToken'
      | 'login'
      | 'displayName'
      | 'avatarUrl'
    >,
  ) {
    const dbUser = await this.findOne(user.id);

    if (dbUser && dbUser.accessToken) {
      // TODO: don't await this operation?
      console.log('revokeToken', dbUser.accessToken);

      const response = await this.twitchApiService.revokeToken({
        token: dbUser.accessToken,
        client_id: this.clientId,
      });

      console.log('revokeToken', response);
    }

    return this.userRepo.save(user);
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
      sub ? this.isSub(channel, user) : { isSub: undefined },
      types.follower
        ? this.isFollower(channel, user)
        : { isFollower: undefined },
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
    let response: AxiosResponse<CheckUserSubscriptionResponse>;
    let accessToken = user.accessToken;

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

          if (updatedUser === null) return { isSub: false };

          accessToken = updatedUser.accessToken;
        } else {
          return { isSub: false };
        }
      }
    }

    const tier = response.data.data[0].tier as SubTier;

    return { isSub: true, tier };
  }

  async isFollower(
    channel: User,
    user: User,
  ): Promise<{ isFollower: boolean; minutesFollowed?: number }> {
    let response: AxiosResponse<GetUserFollowsResponse>;
    let accessToken = user.accessToken;

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

          if (updatedUser === null) return { isFollower: false };

          accessToken = updatedUser.accessToken;
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
    let response: AxiosResponse<GetChannelEditorsResponse>;
    let accessToken = channel.accessToken;

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

          if (updatedUser === null) return new Set();

          accessToken = updatedUser.accessToken;
        } else {
          return new Set();
        }
      }
    }

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelMods(channel: User): Promise<Set<string>> {
    let response: AxiosResponse<GetModeratorsResponse>;
    let accessToken = channel.accessToken;

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

          if (updatedUser === null) return new Set();

          accessToken = updatedUser.accessToken;
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

  /**
   * Try to refresh tokens and write them to the db
   * @returns null if refresh failed
   * @returns the updated user if refresh succeeded
   */
  private async refreshToken(user: User): Promise<User | null> {
    let response: AxiosResponse<RefreshTokenResponse>;

    try {
      response = await this.twitchApiService.refreshToken({} as any);
    } catch (e) {
      if (e.response.status === 400) {
        await this.userRepo.save({ ...user, areTokensValid: false });

        return null;
      }
    }

    const {
      data: { access_token, refresh_token },
    } = response;

    const newUser = await this.userRepo.save({
      ...user,
      accessToken: access_token,
      refreshToken: refresh_token,
      areTokensValid: true,
    });

    return newUser;
  }
}
