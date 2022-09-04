import { SubTier } from '../../../src/honey-votes/honey-votes.constants';
import type { User as DbUser } from '../../../src/honey-votes/users/entities/user.entity';
import type {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
  GetVipsResponse,
  RefreshTokenResponse,
  UnauthorizedResponse,
} from '../../../src/twitch-api/twitch-api.interface';

type User = Pick<DbUser, 'id' | 'displayName' | 'login'>;

const SUB_TIER: Record<
  SubTier,
  CheckUserSubscriptionResponse['data'][0]['tier']
> = {
  [SubTier.Tier1]: '1000',
  [SubTier.Tier2]: '2000',
  [SubTier.Tier3]: '3000',
};

class MakeResponse {
  static twitch400() {
    return {
      error: 'Bad Request',
      status: 400,
      message: 'Invalid refresh token',
    };
  }
  static twitch401(): UnauthorizedResponse {
    return {
      status: 401,
      error: 'Unauthorized',
      message: 'Token invalid or missing required scope',
    };
  }

  static twitchRefreshToken(
    accessToken = '',
    refreshToken = '',
    scope: string[] = [],
  ): RefreshTokenResponse {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      scope,
    };
  }

  static twitchGetChannelEditors(
    editors: User[] = [],
  ): GetChannelEditorsResponse {
    return {
      data: editors.map(({ id, displayName }) => ({
        user_id: id,
        user_name: displayName,
        created_at: new Date().toISOString(),
      })),
    };
  }
  static twitchGetModerators(moderators: User[] = []): GetModeratorsResponse {
    return {
      data: moderators.map(({ id, login, displayName }) => ({
        user_id: id,
        user_login: login,
        user_name: displayName,
      })),
      pagination: {},
    };
  }
  static twitchGetVips(vips: User[] = []): GetVipsResponse {
    return {
      data: vips.map(({ id, login, displayName }) => ({
        user_id: id,
        user_login: login,
        user_name: displayName,
      })),
      pagination: {},
    };
  }
  static twitchCheckUserSubscription(
    broadcaster: User,
    tier = SubTier.Tier1,
  ): CheckUserSubscriptionResponse {
    return {
      data: [
        {
          broadcaster_id: broadcaster.id,
          broadcaster_login: broadcaster.login,
          broadcaster_name: broadcaster.displayName,
          is_gift: false,
          tier: SUB_TIER[tier],
        },
      ],
    };
  }
  static twitchGetUserFollows(
    broadcaster: User,
    follows: User[] = [],
    followedAt = new Date().toISOString(),
  ): GetUserFollowsResponse {
    return {
      total: follows.length,
      data: follows.map(({ id, login, displayName }) => ({
        from_id: id,
        from_login: login,
        from_name: displayName,
        to_id: broadcaster.id,
        to_name: broadcaster.displayName,
        followed_at: followedAt,
      })),
      pagination: {},
    };
  }
}

export default MakeResponse;
