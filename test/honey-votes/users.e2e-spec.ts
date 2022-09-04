/* eslint-disable @typescript-eslint/no-shadow */
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import R from 'ramda';
import { User } from '../../src/honey-votes/users/entities/user.entity';
import { UserRoles } from '../../src/honey-votes/users/users.interface';
import { API_BASE, SubTier } from '../../src/honey-votes/honey-votes.constants';
import HoneyVotesContext from './utils/honey-votes-context.class';
import MockRequests, { MockRequestConfig } from './utils/mock-requests.class';
import MakeResponse from './utils/make-response.class';

describe('HoneyVotes - Users (e2e)', () => {
  const ctx = new HoneyVotesContext();
  const mr = new MockRequests();

  beforeAll(() => Promise.all([ctx.create(), mr.listen()]));
  afterEach(() => Promise.all([ctx.clearTables(), mr.resetHandlers()]));
  afterAll(() => Promise.all([ctx.destroy(), mr.close()]));

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
          broadcasterType: user.broadcasterType,
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
    type MockRequestsType = 'success' | 'failure' | 'fail-once';

    const fail = { status: 401, response: MakeResponse.twitch401() };

    const mockRequestsChannelAccessToken = (
      initiator: User,
      type: MockRequestsType,
    ) => {
      const editorSuccess = {
        status: 200,
        response: MakeResponse.twitchGetChannelEditors([initiator]),
      };
      const modSuccess = {
        status: 200,
        response: MakeResponse.twitchGetModerators([initiator]),
      };
      const vipSuccess = {
        status: 200,
        response: MakeResponse.twitchGetVips([initiator]),
      };

      const editorResult: MockRequestConfig = [];
      const modResult: MockRequestConfig = [];
      const vipResult: MockRequestConfig = [];

      if (type === 'success') {
        editorResult.push(editorSuccess);
        modResult.push(modSuccess);
        vipResult.push(vipSuccess);
      }
      if (type === 'failure') {
        editorResult.push(fail);
        modResult.push(fail);
        vipResult.push(fail);
      }
      if (type === 'fail-once') {
        editorResult.push(fail, editorSuccess);
        modResult.push(fail, modSuccess);
        vipResult.push(fail, vipSuccess);
      }

      mr.mockTwitchGetChannelEditors(editorResult);
      mr.mockTwitchGetModerators(modResult);
      mr.mockTwitchGetVips(vipResult);
    };
    const mockRequestsUserAccessToken = (
      broadcaster: User,
      type: MockRequestsType,
    ) => {
      const subSuccess = {
        status: 200,
        response: MakeResponse.twitchCheckUserSubscription(broadcaster),
      };
      const followerSuccess = {
        status: 200,
        response: MakeResponse.twitchGetUserFollows(broadcaster),
      };

      const subResult: MockRequestConfig = [];
      const followerResult: MockRequestConfig = [];

      if (type === 'success') {
        subResult.push(subSuccess);
        followerResult.push(followerSuccess);
      }
      if (type === 'failure') {
        subResult.push(fail);
        followerResult.push(fail);
      }
      if (type === 'fail-once') {
        subResult.push(fail, subSuccess);
        followerResult.push(fail, followerSuccess);
      }

      mr.mockTwitchCheckUserSubscription(subResult);
      mr.mockTwitchGetUserFollows(followerResult);
    };

    const testRefreshTokenCalls = async (
      channelResult: MockRequestsType,
      userResult: MockRequestsType,
    ) => {
      const [broadcaster, initiator] = await ctx.createUsers();
      let refreshTokenRequestsCount = 0;

      mr.server.use(
        mr.rest.post('https://id.twitch.tv/oauth2/token', (req, res, ctx) => {
          refreshTokenRequestsCount += 1;
          return res(
            ctx.status(200),
            ctx.json(MakeResponse.twitchRefreshToken()),
          );
        }),
      );

      mockRequestsChannelAccessToken(initiator, channelResult);
      mockRequestsUserAccessToken(broadcaster, userResult);

      mr.mockTwitchOAuthRevoke({ status: 200 });

      await request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me/roles?id=${broadcaster.id}`)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(HttpStatus.OK);

      return refreshTokenRequestsCount;
    };

    const testRefreshToken = async (
      type: 'channel' | 'user',
      result: 'success' | 'failure',
    ) => {
      const [broadcaster, initiator] = await ctx.createUsers();

      mr.mockTwitchOAuthToken({
        status: result === 'success' ? 200 : 400,
        response:
          result === 'success'
            ? MakeResponse.twitchRefreshToken()
            : MakeResponse.twitch400(),
      });
      mr.mockTwitchOAuthRevoke({ status: 200 });

      mockRequestsChannelAccessToken(
        initiator,
        type === 'channel' ? 'fail-once' : 'success',
      );
      mockRequestsUserAccessToken(
        broadcaster,
        type === 'user' ? 'fail-once' : 'success',
      );

      await request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me/roles?id=${broadcaster.id}`)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(HttpStatus.OK);

      const id = type === 'channel' ? broadcaster.id : initiator.id;

      const user = await ctx.userRepo.findOne({
        where: { id },
        relations: { credentials: true },
      });

      expect(user).toMatchObject({
        credentials: {
          encryptedAccessToken: expect.any(String),
          encryptedRefreshToken: expect.any(String),
        },
        areTokensValid: result === 'success',
      });
    };

    it('should return user roles', async () => {
      const [broadcaster, initiator] = await ctx.createUsers();

      mr.mockTwitchUserRoles(broadcaster, initiator, {
        editor: true,
        mod: true,
        vip: true,
        sub: true,
        follower: true,
      });

      await request(ctx.app.getHttpServer())
        .get(`${API_BASE}/users/me/roles?id=${broadcaster.id}`)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(HttpStatus.OK)
        .expect((response) =>
          expect(response.body).toMatchObject({
            broadcaster: false,
            editor: true,
            mod: true,
            vip: true,
            sub: true,
            subTier: SubTier.Tier1,
            follower: true,
            minutesFollowed: expect.any(Number),
          } as UserRoles),
        );
    });

    describe('twitch api returned 401', () => {
      it('should call refreshToken only once if user accessToken is expired', async () => {
        expect(await testRefreshTokenCalls('success', 'fail-once')).toBe(1);
      });

      it('should call refreshToken only once if channel accessToken is expired', async () => {
        expect(await testRefreshTokenCalls('fail-once', 'success')).toBe(1);
      });

      it("should call refreshToken twice if user's and channel's accessTokens are expired", async () => {
        expect(await testRefreshTokenCalls('fail-once', 'fail-once')).toBe(2);
      });

      it('should refresh and store channel accessToken: success', async () => {
        await testRefreshToken('channel', 'success');
      });

      it('should refresh and store channel accessToken: failure', async () => {
        await testRefreshToken('channel', 'failure');
      });

      it('should refresh and store user accessToken: success', async () => {
        await testRefreshToken('user', 'success');
      });

      test('should refresh and store user accessToken: failure', async () => {
        await testRefreshToken('user', 'failure');
      });
    });
  });
});
