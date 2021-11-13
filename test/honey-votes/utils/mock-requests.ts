import { SubTier } from '../../../src/honey-votes/honey-votes.constants';
import {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
} from '../../../src/twitch-api/twitch-api.interface';
import { server, rest } from './test-server';
import { MockUser } from './users';

type User = Pick<MockUser, 'id' | 'displayName' | 'login'>;

const SUB_TIER: Record<
  SubTier,
  CheckUserSubscriptionResponse['data'][0]['tier']
> = {
  [SubTier.Tier1]: '1000',
  [SubTier.Tier2]: '2000',
  [SubTier.Tier3]: '3000',
};

// TODO: refactor get response functions
export const mockGetChannelEditors = (editors: User[] = []) => {
  const response: GetChannelEditorsResponse = {
    data: editors.map(({ id, displayName }) => ({
      user_id: id,
      user_name: displayName,
      created_at: new Date().toISOString(),
    })),
  };

  server.use(
    rest.get('https://api.twitch.tv/helix/channels/editors', (req, res, ctx) =>
      res(ctx.status(200), ctx.json(response)),
    ),
  );
};

export const mockGetModerators = (moderators: User[] = []) => {
  const response: GetModeratorsResponse = {
    data: moderators.map(({ id, login, displayName }) => ({
      user_id: id,
      user_login: login,
      user_name: displayName,
    })),
    pagination: {},
  };

  server.use(
    rest.get(
      'https://api.twitch.tv/helix/moderation/moderators',
      (req, res, ctx) => res(ctx.status(200), ctx.json(response)),
    ),
  );
};

export const mockCheckUserSubscription = (
  broadcaster?: User,
  tier?: SubTier,
  gifter: MockUser | null = null,
) => {
  const entry = broadcaster
    ? {
        broadcaster_id: broadcaster.id,
        broadcaster_login: broadcaster.login,
        broadcaster_name: broadcaster.displayName,
        is_gift: !!gifter,
        tier: SUB_TIER[tier],
        ...(gifter
          ? {
              gifter_id: gifter.id,
              gifter_login: gifter.login,
              gifter_name: gifter.displayName,
            }
          : undefined),
      }
    : undefined;

  const statusCode = entry ? 200 : 404;
  const response: CheckUserSubscriptionResponse = {
    data: entry ? [entry] : [],
  };

  server.use(
    rest.get(
      'https://api.twitch.tv/helix/subscriptions/user',
      (req, res, ctx) => res(ctx.status(statusCode), ctx.json(response)),
    ),
  );
};

export const mockGetUserFollows = (
  from?: User,
  to?: User,
  followedAt: Date = new Date(),
) => {
  const entry =
    from && to
      ? {
          from_id: from.id,
          from_login: from.login,
          from_name: from.displayName,
          to_id: to.id,
          to_name: to.displayName,
          followed_at: followedAt.toISOString(),
        }
      : undefined;

  const response: GetUserFollowsResponse = {
    total: 1,
    data: entry ? [entry] : [],
    pagination: {},
  };

  server.use(
    rest.get('https://api.twitch.tv/helix/users/follows', (req, res, ctx) =>
      res(ctx.status(200), ctx.json(response)),
    ),
  );
};

export const mockGetFilmData = (
  id: number,
  response: any,
  { statusCode }: { statusCode: number } = { statusCode: 200 },
) => {
  server.use(
    rest.get(
      `https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`,
      (req, res, ctx) => res(ctx.status(statusCode), ctx.json(response)),
    ),
  );
};

export const mockIgdbGames = (response: any = []) => {
  server.use(
    rest.post('https://api.igdb.com/v4/games', (req, res, ctx) =>
      res(ctx.status(200), ctx.json(response)),
    ),
  );
};
