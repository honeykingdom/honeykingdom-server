import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInMinutes } from 'date-fns';
import ms from 'ms';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { Config } from '../../config/config.interface';
import { TwitchApiService } from '../../twitch-api/twitch-api.service';
import { SubTier, TwitchUserType } from '../honey-votes.interface';
import { User } from './entities/User.entity';

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
      console.log('revokeToken', dbUser.accessToken);

      const response = await this.twitchApiService.revokeToken(
        dbUser.accessToken,
        this.clientId,
      );

      console.log('revokeToken', response);
    }

    return this.userRepo.save({ ...user, validatedAt: new Date() });
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
    const response = await this.twitchApiService.checkUserSubscription(
      { broadcaster_id: channel.id, user_id: user.id },
      { clientId: this.clientId, accessToken: user.accessToken },
    );

    if (response.status !== 200) return { isSub: false };

    const isSub = response.data.data.length > 0;
    const tier = response.data.data[0].tier as SubTier;

    return { isSub, tier };
  }

  async isFollower(
    channel: User,
    user: User,
  ): Promise<{ isFollower: boolean; minutesFollowed?: number }> {
    const response = await this.twitchApiService.getUserFollows(
      { from_id: user.id, to_id: channel.id },
      { clientId: this.clientId, accessToken: user.accessToken },
    );

    if (response.status !== 200) return { isFollower: false };

    const followedAt = new Date(response.data.data[0].followed_at);
    const minutesFollowed = differenceInMinutes(new Date(), followedAt);

    return { isFollower: true, minutesFollowed };
  }

  async getChannelEditors(channel: User): Promise<Set<string>> {
    const response = await this.twitchApiService.getChannelEditors(channel.id, {
      clientId: this.clientId,
      accessToken: channel.accessToken,
    });

    if (response.status !== 200) return new Set();

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelMods(channel: User): Promise<Set<string>> {
    const response = await this.twitchApiService.getModerators(channel.id, {
      clientId: this.clientId,
      accessToken: channel.accessToken,
    });

    if (response.status !== 200) return new Set();

    return new Set(response.data.data.map((u) => u.user_id));
  }

  private async getChannelVips(channelId: string): Promise<Set<string>> {
    return new Set();
  }
}
