import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { DeepPartial } from 'typeorm';
import R from 'ramda';
import { server, rest } from './utils/test-server';
import { users } from './utils/users';
import { Voting } from '../../src/honey-votes/votes/entities/voting.entity';
import { User } from '../../src/honey-votes/users/entities/user.entity';
import {
  API_BASE,
  VotingOptionType,
} from '../../src/honey-votes/honey-votes.constants';
import {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
  RefreshTokenResponse,
  UnauthorizedResponse,
} from '../../src/twitch-api/twitch-api.interface';
import { CreateVotingOptionDto } from '../../src/honey-votes/votes/dto/create-voting-option.dto';
import { votingPermissionsForbidden } from './utils/common';
import { getHoneyVotesTestContext } from './utils/getHoneyVotesTestContext';

const response400 = {
  error: 'Bad Request',
  status: 400,
  message: 'Invalid refresh token',
};
const response401: UnauthorizedResponse = {
  status: 401,
  error: 'Unauthorized',
  message: 'Token invalid or missing required scope',
};
const refreshTokenResponse: RefreshTokenResponse = {
  access_token: 'new-access-token',
  refresh_token: 'new-refresh-token',
  scope: [],
};

const makeGetChannelEditorsResponse = (
  broadcaster: User,
  initiator: User,
): GetChannelEditorsResponse => ({
  data: [
    {
      user_id: initiator.id,
      user_name: initiator.displayName,
      created_at: new Date().toISOString(),
    },
  ],
});

const makeGetModeratorsResponse = (
  broadcaster: User,
  initiator: User,
): GetModeratorsResponse => ({
  data: [
    {
      user_id: initiator.id,
      user_login: initiator.login,
      user_name: initiator.displayName,
    },
  ],
  pagination: {},
});

const makeCheckUserSubscriptionResponse = (
  broadcaster: User,
  initiator: User,
): CheckUserSubscriptionResponse => ({
  data: [
    {
      broadcaster_id: broadcaster.id,
      broadcaster_login: broadcaster.login,
      broadcaster_name: broadcaster.displayName,
      is_gift: false,
      tier: '1000',
    },
  ],
});

const makeGetUserFollowsResponse = (
  broadcaster: User,
  initiator: User,
): GetUserFollowsResponse => ({
  total: 1,
  data: [
    {
      from_id: initiator.id,
      from_login: initiator.login,
      from_name: initiator.displayName,
      to_id: broadcaster.id,
      to_name: broadcaster.displayName,
      followed_at: new Date().toISOString(),
    },
  ],
  pagination: {},
});

describe('HoneyVotes - Users (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  type UserType = 'editor' | 'mod' | 'sub' | 'follower';

  const urls: Record<UserType, string> = {
    editor: 'https://api.twitch.tv/helix/channels/editors',
    mod: 'https://api.twitch.tv/helix/moderation/moderators',
    sub: 'https://api.twitch.tv/helix/subscriptions/user',
    follower: 'https://api.twitch.tv/helix/users/follows',
  };

  const mergeUserTypeParams: Record<
    UserType,
    DeepPartial<Voting['permissions']>
  > = {
    editor: {},
    mod: { mod: { canAddOptions: true } },
    sub: { sub: { canAddOptions: true } },
    follower: { follower: { canAddOptions: true } },
  };

  const mockRefreshTokenSuccess = (url: string, response200: any) => {
    let requestsCount = 0;

    server.use(
      rest.post('https://id.twitch.tv/oauth2/token', (req, res, ctx) =>
        res(ctx.status(200), ctx.json(refreshTokenResponse)),
      ),
      rest.get(url, (req, res, ctx) =>
        requestsCount++ === 0
          ? res(ctx.status(401), ctx.json(response401))
          : res(ctx.status(200), ctx.json(response200)),
      ),
    );
  };

  const mockRefreshTokenFailure = (url: string) => {
    server.use(
      rest.post('https://id.twitch.tv/oauth2/token', (req, res, ctx) =>
        res(ctx.status(400), ctx.json(response400)),
      ),
      rest.get(url, (req, res, ctx) =>
        res(ctx.status(401), ctx.json(response401)),
      ),
    );
  };

  const mockRevokeToken = (responseCode: 200 | 400 = 200) => {
    server.use(
      rest.post('https://id.twitch.tv/oauth2/revoke', (req, res, ctx) =>
        res(ctx.status(responseCode)),
      ),
    );
  };

  const testRefreshTwitchToken = async (
    type: UserType,
    result: 'success' | 'failure',
    broadcasterParams: { areTokensValid: boolean } = { areTokensValid: true },
    initiatorParams: { areTokensValid: boolean } = { areTokensValid: true },
  ) => {
    const [rawBroadcaster, rawInitiator] = users;
    const [broadcaster, initiator] = await ctx.createUsers([
      { ...rawBroadcaster, ...broadcasterParams },
      { ...rawInitiator, ...initiatorParams },
    ]);
    const voting = await ctx.votingRepo.save({
      permissions: R.mergeDeepRight(
        votingPermissionsForbidden,
        mergeUserTypeParams[type],
      ),
      broadcaster,
    } as Voting);

    const body: CreateVotingOptionDto = {
      votingId: voting.id,
      type: VotingOptionType.Custom,
      [VotingOptionType.Custom]: { title: 'Test Voting' },
    };

    let response200: any;

    if (type === 'editor') {
      response200 = makeGetChannelEditorsResponse(broadcaster, initiator);
    }

    if (type === 'mod') {
      response200 = makeGetModeratorsResponse(broadcaster, initiator);
    }

    if (type === 'sub') {
      response200 = makeCheckUserSubscriptionResponse(broadcaster, initiator);
    }

    if (type === 'follower') {
      response200 = makeGetUserFollowsResponse(broadcaster, initiator);
    }

    if (type !== 'editor') {
      server.use(
        rest.get(urls.editor, (req, res, ctx) =>
          res(ctx.status(200), ctx.json({ data: [] })),
        ),
      );
    }

    if (result === 'success') {
      mockRefreshTokenSuccess(urls[type], response200);
    } else {
      mockRefreshTokenFailure(urls[type]);
    }

    mockRevokeToken();

    await request(ctx.app.getHttpServer())
      .post(`${API_BASE}/voting-options`)
      .set(...ctx.getAuthorizationHeader(initiator))
      .send(body)
      .expect(result === 'success' ? HttpStatus.CREATED : HttpStatus.FORBIDDEN);

    // isEditor - uses broadcaster credentials
    // isMod - uses broadcaster credentials
    // isSub - uses initiator credentials
    // isFollower - doesn't matter but uses initiator credentials
    const userId =
      type === 'editor' || type === 'mod' ? broadcaster.id : initiator.id;
    const user = await ctx.userRepo.findOne(userId, {
      relations: ['credentials'],
    });

    if (result === 'success') {
      expect(user).toMatchObject({
        credentials: {
          encryptedAccessToken: expect.any(String),
          encryptedRefreshToken: expect.any(String),
        },
        areTokensValid: true,
      });
    }

    if (result === 'failure') {
      expect(user).toMatchObject({
        credentials: {
          encryptedAccessToken: expect.any(String),
          encryptedRefreshToken: expect.any(String),
        },
        areTokensValid: false,
      });
    }
  };

  describe('/users (GET)', () => {
    const omitUser = R.omit(['credentials', 'createdAt', 'updatedAt']);

    it('should return user by id', async () => {
      const [user] = await ctx.createUsers();

      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users?id=${user.id}`)
        .expect(HttpStatus.OK)
        .expect(omitUser(user));
    });

    it('should return user by login', async () => {
      const [user] = await ctx.createUsers();

      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users?login=${user.login}`)
        .expect(HttpStatus.OK)
        .expect(omitUser(user));
    });

    it('should return 400 if id or login is not specified', async () => {
      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 if user is not exists', async () => {
      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users?id=1`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('/users/me (GET)', () => {
    it('should return authenticated user', async () => {
      const [user] = await ctx.createUsers();

      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me`)
        .set(...ctx.getAuthorizationHeader(user))
        .expect(HttpStatus.OK)
        .expect({
          id: user.id,
          login: user.login,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          areTokensValid: true,
        } as Partial<User>);
    });

    it('should return 401 if there is no token', async () => {
      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 if token is expired', async () => {
      const [user] = await ctx.createUsers();

      return request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me`)
        .set(...ctx.getAuthorizationHeader(user, { expired: true }))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/users/me/roles (GET)', () => {
    it.todo('should handle if userId and channelId is the same');

    // TODO: i'm not sure is this test correct
    it('should call twitch refreshToken api method only once if accessToken is expired', async () => {
      const [broadcaster, initiator] = await ctx.createUsers();
      let requestsCount = 0;
      let refreshTokenRequestsCount = 0;

      server.use(
        rest.post('https://id.twitch.tv/oauth2/token', (req, res, ctx) => {
          refreshTokenRequestsCount += 1;
          return res(ctx.status(200), ctx.json(refreshTokenResponse));
        }),
        rest.get(urls.editor, (req, res, ctx) =>
          requestsCount++ === 0
            ? res(ctx.status(401), ctx.json(response401))
            : res(
                ctx.status(200),
                ctx.json(makeGetChannelEditorsResponse(broadcaster, initiator)),
              ),
        ),
        rest.get(urls.mod, (req, res, ctx) =>
          requestsCount++ === 0
            ? res(ctx.status(401), ctx.json(response401))
            : res(
                ctx.status(200),
                ctx.json(makeGetModeratorsResponse(broadcaster, initiator)),
              ),
        ),
        rest.get(urls.sub, (req, res, ctx) =>
          requestsCount++ === 0
            ? res(ctx.status(401), ctx.json(response401))
            : res(
                ctx.status(200),
                ctx.json(
                  makeCheckUserSubscriptionResponse(broadcaster, initiator),
                ),
              ),
        ),
        rest.get(urls.follower, (req, res, ctx) =>
          requestsCount++ === 0
            ? res(ctx.status(401), ctx.json(response401))
            : res(
                ctx.status(200),
                ctx.json(makeGetUserFollowsResponse(broadcaster, initiator)),
              ),
        ),
      );

      await request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me/roles?id=${broadcaster.id}`)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(HttpStatus.OK);

      expect(refreshTokenRequestsCount).toBe(1);
    });
  });

  describe('refresh tokens if twitch api returned 401', () => {
    describe('success -> revoke old token, update tokens in the db and retry', () => {
      test('isEditor', async () => {
        await testRefreshTwitchToken('editor', 'success');
      });

      test('isMod', async () => {
        await testRefreshTwitchToken('mod', 'success');
      });

      test('isSub', async () => {
        await testRefreshTwitchToken('sub', 'success');
      });

      test('isFollower', async () => {
        await testRefreshTwitchToken('follower', 'success');
      });
    });

    describe('failure -> set "areTokensValid=false" and clear tokens in the db', () => {
      test('isEditor', async () => {
        await testRefreshTwitchToken('editor', 'failure');
      });

      test('isMod', async () => {
        await testRefreshTwitchToken('mod', 'failure');
      });

      test('isSub', async () => {
        await testRefreshTwitchToken('sub', 'failure');
      });

      test('isFollower', async () => {
        await testRefreshTwitchToken('follower', 'failure');
      });
    });
  });

  describe('should return 401 if credentials are already invalid', () => {
    test('isEditor: channel credentials', async () => {
      await testRefreshTwitchToken(
        'editor',
        'failure',
        { areTokensValid: false },
        { areTokensValid: true },
      );
    });

    test('isMod: channel credentials', async () => {
      await testRefreshTwitchToken(
        'mod',
        'failure',
        { areTokensValid: false },
        { areTokensValid: true },
      );
    });

    test('isSub: user credentials', async () => {
      await testRefreshTwitchToken(
        'sub',
        'failure',
        { areTokensValid: true },
        { areTokensValid: false },
      );
    });

    test('isFollower: user credentials', async () => {
      await testRefreshTwitchToken(
        'follower',
        'failure',
        { areTokensValid: true },
        { areTokensValid: false },
      );
    });
  });
});
