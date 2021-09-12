import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Connection, DeepPartial, Repository } from 'typeorm';
import R from 'ramda';
import { server, rest } from './utils/test-server';
import { MockUser, users } from './utils/users';
import { signAccessToken, SignTokenOptions } from './utils/auth';
import { typeOrmPostgresModule } from '../../src/typeorm';
import { HoneyVotesModule } from '../../src/honey-votes/honey-votes.module';
import { User } from '../../src/honey-votes/users/entities/User.entity';
import { Voting } from '../../src/honey-votes/votes/entities/Voting.entity';
import { DatabaseModule } from '../../src/database/database.module';
import { DatabaseService } from '../../src/database/database.service';
import { Config } from '../../src/config/config.interface';
import {
  API_BASE,
  VotingOptionType,
} from '../../src/honey-votes/honey-votes.interface';
import {
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsResponse,
  RefreshTokenResponse,
  UnauthorizedResponse,
} from '../../src/twitch-api/twitch-api.interface';
import { AddVotingOptionDto } from '../../src/honey-votes/votes/dto/addVotingOptionDto';
import { votingUserTypesParamsForbidden } from './utils/common';
import { TwitchChatModule } from '../../src/twitch-chat/twitch-chat.module';
import { twitchChatServiceMock } from './chat-votes.e2e-spec';

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
  scope: '',
};

describe('HoneyVotes - Users (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userRepo: Repository<User>;
  let votingRepo: Repository<Voting>;
  let configService: ConfigService<Config>;
  let jwtService: JwtService;

  const getAuthorizationHeader = (
    { id, login }: MockUser,
    signTokenOptions?: SignTokenOptions,
  ) =>
    `Bearer ${signAccessToken(
      { sub: id, login },
      jwtService,
      configService,
      signTokenOptions,
    )}`;

  type UserType = 'editor' | 'mod' | 'sub' | 'follower';

  const urls: Record<UserType, string> = {
    editor: 'https://api.twitch.tv/helix/channels/editors',
    mod: 'https://api.twitch.tv/helix/moderation/moderators',
    sub: 'https://api.twitch.tv/helix/subscriptions/user',
    follower: 'https://api.twitch.tv/helix/users/follows',
  };

  const mergeUserTypeParams: Record<
    UserType,
    DeepPartial<Voting['userTypesParams']>
  > = {
    editor: {},
    mod: { mod: { canAddOptions: true } },
    sub: { subTier1: { canAddOptions: true } },
    follower: { follower: { canAddOptions: true } },
  };

  const mockRefreshTokenSuccess = (url: string, response200: any) => {
    let followsRequestCount = 0;

    server.use(
      rest.post('https://id.twitch.tv/oauth2/token', (req, res, ctx) =>
        res(ctx.status(200), ctx.json(refreshTokenResponse)),
      ),
      rest.get(url, (req, res, ctx) =>
        followsRequestCount++ === 0
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

  const testRefreshTwitchToken = async (
    type: UserType,
    result: 'success' | 'failure',
    broadcasterParams: { areTokensValid: boolean } = { areTokensValid: true },
    initiatorParams: { areTokensValid: boolean } = { areTokensValid: true },
  ) => {
    const [rawBroadcaster, rawInitiator] = users;
    const [broadcaster, initiator] = await userRepo.save([
      { ...rawBroadcaster, ...broadcasterParams },
      { ...rawInitiator, ...initiatorParams },
    ]);
    const voting = await votingRepo.save({
      userTypesParams: R.mergeDeepRight(
        votingUserTypesParamsForbidden,
        mergeUserTypeParams[type],
      ),
      broadcaster,
    } as Voting);

    const body: AddVotingOptionDto = {
      votingId: voting.id,
      payload: { type: VotingOptionType.Custom, title: 'Test Voting' },
    };

    let response200: any;

    // TODO: refactor this
    if (type === 'editor') {
      response200 = {
        data: [
          {
            user_id: initiator.id,
            user_name: initiator.displayName,
            created_at: new Date().toISOString(),
          },
        ],
      } as GetChannelEditorsResponse;
    }

    if (type === 'mod') {
      response200 = {
        data: [
          {
            user_id: initiator.id,
            user_login: initiator.login,
            user_name: initiator.displayName,
          },
        ],
        pagination: {},
      } as GetModeratorsResponse;
    }

    if (type === 'sub') {
      response200 = {
        data: [
          {
            broadcaster_id: broadcaster.id,
            broadcaster_login: broadcaster.login,
            broadcaster_name: broadcaster.displayName,
            is_gift: false,
            tier: '1000',
          },
        ],
      } as CheckUserSubscriptionResponse;
    }

    if (type === 'follower') {
      response200 = {
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
      } as GetUserFollowsResponse;
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

    await request(app.getHttpServer())
      .post(`${API_BASE}/voting-options`)
      .set('Authorization', getAuthorizationHeader(initiator))
      .send(body)
      .expect(result === 'success' ? 201 : 401);

    // isEditor - uses broadcaster credentials
    // isMod - uses broadcaster credentials
    // isSub - uses initiator credentials
    // isFollower - doesn't matter but uses initiator credentials
    const userId =
      type === 'editor' || type === 'mod' ? broadcaster.id : initiator.id;
    const user = await userRepo.findOne(userId, { relations: ['credentials'] });

    if (result === 'success') {
      expect(user).toMatchObject({
        credentials: {
          accessToken: refreshTokenResponse.access_token,
          refreshToken: refreshTokenResponse.refresh_token,
        },
        areTokensValid: true,
      });
    }

    if (result === 'failure') {
      expect(user).toMatchObject({
        credentials: {
          accessToken: '',
          refreshToken: '',
        },
        areTokensValid: false,
      });
    }
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({ envFilePath: '.env.test' }),
        typeOrmPostgresModule,
        HoneyVotesModule,
      ],
    })
      .overrideProvider(TwitchChatModule)
      .useValue({})
      .overrideProvider('TwitchChatModuleAnonymous')
      .useValue(twitchChatServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    connection = moduleFixture
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();

    userRepo = connection.getRepository(User);
    votingRepo = connection.getRepository(Voting);
    configService = app.get<ConfigService<Config>>(ConfigService);
    jwtService = app.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    await connection.query(`TRUNCATE ${User.tableName} CASCADE;`);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('/users (GET)', () => {
    const omitUser = R.omit(['credentials', 'createdAt', 'updatedAt']);

    it('should return user by id', async () => {
      const [user] = await userRepo.save(users);

      return request(app.getHttpServer())
        .get(`${API_BASE}/users?id=${user.id}`)
        .expect(200)
        .expect(omitUser(user));
    });

    it('should return user by login', async () => {
      const [user] = await userRepo.save(users);

      return request(app.getHttpServer())
        .get(`${API_BASE}/users?login=${user.login}`)
        .expect(200)
        .expect(omitUser(user));
    });

    it('should return 400 if id or login is not specified', async () => {
      return request(app.getHttpServer()).get(`${API_BASE}/users`).expect(400);
    });

    it('should return 404 if user is not exists', async () => {
      return request(app.getHttpServer())
        .get(`${API_BASE}/users?id=1`)
        .expect(404);
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
