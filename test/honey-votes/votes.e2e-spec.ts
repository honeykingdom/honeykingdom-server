import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Connection, Repository } from 'typeorm';
import R from 'ramda';
import { sub } from 'date-fns';
import { HoneyVotesModule } from '../../src/honey-votes/honey-votes.module';
import {
  User,
  USER_TABLE_NAME,
} from '../../src/honey-votes/users/entities/User.entity';
import {
  Voting,
  VOTING_USER_TYPES_PARAMS_DEFAULT,
  VOTING_CAN_MANAGE_VOTES_DEFAULT,
  VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT,
  VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  VOTING_OPTIONS_LIMIT_DEFAULT,
  VOTING_TITLE_MAX_LENGTH,
  VOTING_DESCRIPTION_MAX_LENGTH,
  VOTING_TABLE_NAME,
  VOTING_OPTIONS_LIMIT_MIN,
  VOTING_OPTIONS_LIMIT_MAX,
  UserTypesParams,
} from '../../src/honey-votes/votes/entities/Voting.entity';
import {
  VotingOption,
  VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTION_CARD_TITLE_MAX_LENGTH,
  VOTING_OPTION_TABLE_NAME,
} from '../../src/honey-votes/votes/entities/VotingOption.entity';
import {
  Vote,
  VOTE_TABLE_NAME,
} from '../../src/honey-votes/votes/entities/Vote.entity';
import { Config } from '../../src/config/config.interface';
import { typeOrmPostgresModule } from '../../src/db';
import { DatabaseModule } from '../../src/database/database.module';
import { DatabaseService } from '../../src/database/database.service';
import { AddVotingDto } from '../../src/honey-votes/votes/dto/addVotingDto';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.interface';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.interface';
import { UpdateVotingDto } from '../../src/honey-votes/votes/dto/updateVotingDto';
import { AddVotingOptionDto } from '../../src/honey-votes/votes/dto/addVotingOptionDto';
import { signAccessToken } from './utils/auth';
import { users, MockUser } from './utils/users';
import {
  mockCheckUserSubscription,
  mockGetChannelEditors,
  mockGetFilmData,
  mockGetModerators,
  mockGetUserFollows,
  mockIgdbGames,
} from './utils/mock-requests';
import { movie371 } from '../kinopoisk-api.mock';
import { game379 } from '../igdb-api.mock';

// https://stackoverflow.com/a/61132308/4687416
type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

const POSTGRES_MAX_INTEGER = 2147483647;

describe('HoneyVotes - Votes (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userRepo: Repository<User>;
  let votingRepo: Repository<Voting>;
  let votingOptionRepo: Repository<VotingOption>;
  let voteRepo: Repository<Vote>;
  let jwtService: JwtService;
  let configService: ConfigService<Config>;

  const defaultVotingParams = {
    id: expect.any(Number),
    userId: expect.any(String),
    title: null,
    description: null,
    canManageVotes: VOTING_CAN_MANAGE_VOTES_DEFAULT,
    canManageVotingOptions: VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT,
    userTypesParams: VOTING_USER_TYPES_PARAMS_DEFAULT,
    allowedVotingOptionTypes: VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
    votingOptionsLimit: VOTING_OPTIONS_LIMIT_DEFAULT,
    createdAt: expect.anything(),
    updatedAt: expect.anything(),
  };

  const defaultVotingOptionParams = {
    id: expect.any(Number),
    userId: expect.any(String),
    votingId: expect.any(Number),
    fullVotesValue: 0,
    type: expect.stringMatching(
      new RegExp(
        `^${[
          VotingOptionType.KinopoiskMovie,
          VotingOptionType.IgdbGame,
          VotingOptionType.Custom,
        ].join('|')}$`,
      ),
    ),
    cardId: null,
    cardTitle: expect.any(String),
    cardSubtitle: null,
    cardDescription: null,
    cardImageUrl: null,
    cardUrl: null,
    createdAt: expect.anything(),
    updatedAt: expect.anything(),
  };

  const defaultVoteParams = {
    id: expect.any(Number),
    userId: expect.any(String),
    votingId: expect.any(Number),
    votingOptionId: expect.any(Number),
    value: 1,
    createdAt: expect.anything(),
    updatedAt: expect.anything(),
  };

  const votingUserTypesParamsForbidden = {
    [TwitchUserType.Mod]: { canVote: false, canAddOptions: false },
    [TwitchUserType.Vip]: { canVote: false, canAddOptions: false },
    [TwitchUserType.SubTier1]: { canVote: false, canAddOptions: false },
    [TwitchUserType.SubTier2]: { canVote: false, canAddOptions: false },
    [TwitchUserType.SubTier3]: { canVote: false, canAddOptions: false },
    [TwitchUserType.Follower]: {
      canVote: false,
      canAddOptions: false,
      minutesToFollowRequiredToVote: 0,
      minutesToFollowRequiredToAddOptions: 0,
    },
    [TwitchUserType.Viewer]: { canVote: false, canAddOptions: false },
  };

  const getAuthorizationHeader = ({ id, login }: MockUser) =>
    `Bearer ${signAccessToken({ sub: id, login }, jwtService, configService)}`;

  type UserTypes = {
    isEditor?: boolean;
    isMod?: boolean;
    isVip?: boolean;
    isSub?: boolean;
    tier?: SubTier;
    isFollower?: boolean;
    followedMinutes?: number;
  };

  const mockUserTypes = (
    broadcaster: User,
    user: User,
    {
      isEditor,
      isMod,
      isVip,
      isSub,
      tier,
      isFollower,
      followedMinutes,
    }: UserTypes = {},
  ) => {
    // TODO: test is axios called with correct arguments

    mockGetChannelEditors(isEditor ? [user] : []);
    mockGetModerators(isMod ? [user] : []);
    mockCheckUserSubscription(
      ...((isSub ? [broadcaster, tier] : []) as [User?, SubTier?]),
    );
    mockGetUserFollows(
      ...((isFollower
        ? [broadcaster, user, sub(new Date(), { minutes: followedMinutes })]
        : []) as [User?, User?, Date?]),
    );
  };

  type OnBeforeTest<T> = (
    ctx: T,
  ) => Promise<void | OnAfterTest> | void | OnAfterTest;
  type OnAfterTest = () => Promise<void> | void;

  const testCreateVoting = async ({
    expectedStatusCode,
    expectedErrorMessage,
    broadcaster,
    initiator,
    initiatorTypes,
    addVotingDto = {},
    url,
  }: {
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN;
    expectedErrorMessage?: string[];
    broadcaster: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    addVotingDto?: AddVotingDto;
    url?: string;
  }) => {
    const expectedVoting = {
      ...defaultVotingParams,
      ...addVotingDto,
      userId: broadcaster.id,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const finalUrl = url || `${API_BASE}/${broadcaster.id}/voting`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(addVotingDto)
        .expect(expectedStatusCode)
        .expect((response) => expect(response.body).toEqual(expectedVoting));

      expect(
        await votingRepo.findOne({ where: { user: { id: broadcaster.id } } }),
      ).toEqual(expectedVoting);
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(addVotingDto)
        .expect(expectedStatusCode)
        .expect({
          statusCode: 400,
          message: expectedErrorMessage,
          error: 'Bad Request',
        });

      expect(
        await votingRepo.findOne({ where: { user: { id: broadcaster.id } } }),
      ).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(addVotingDto)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(
        await votingRepo.findOne({ where: { user: { id: broadcaster.id } } }),
      ).toBeUndefined();
    }
  };

  const testUpdateVoting = async ({
    expectedStatusCode,
    broadcaster,
    initiator,
    initiatorTypes,
    url,
  }: {
    expectedStatusCode: HttpStatus.CREATED | HttpStatus.FORBIDDEN;
    broadcaster: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    // updateVotingDto: UpdateVotingDto;
    url?: string;
  }) => {
    const voting = await votingRepo.save({
      user: broadcaster,
      title: 'Test Voting',
    });

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const finalUrl = url || `${API_BASE}/${broadcaster.id}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      const updateVotingDto: UpdateVotingDto = { title: 'New Title' };
      const expectedVoting = {
        ...defaultVotingParams,
        ...updateVotingDto,
        userId: broadcaster.id,
      };

      await request(app.getHttpServer())
        .put(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(updateVotingDto)
        .expect(expectedStatusCode)
        .expect((response) => expect(response.body).toEqual(expectedVoting));

      expect(await votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      const updateVotingDto: UpdateVotingDto = { title: 'New Title' };
      const expectedVoting = {
        ...defaultVotingParams,
        userId: broadcaster.id,
        title: 'Test Voting',
      };

      await request(app.getHttpServer())
        .put(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(updateVotingDto)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }
  };

  const testDeleteVoting = async ({
    expectedStatusCode,
    broadcaster,
    initiator,
    initiatorTypes,
    url,
    onBeforeTest = () => {},
  }: {
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN;
    broadcaster: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    url?: string;
    onBeforeTest?: OnBeforeTest<{ voting: Voting }>;
  }) => {
    const voting = await votingRepo.save({
      user: broadcaster,
      title: 'Test Voting',
    });
    const expectedVoting = {
      ...defaultVotingParams,
      title: 'Test Voting',
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting });

    const finalUrl = url || `${API_BASE}/${broadcaster.id}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(await votingRepo.findOne(voting.id)).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  const testCreateVotingOption = async ({
    expectedStatusCode,
    expectedErrorMessage,
    broadcaster,
    initiator,
    initiatorTypes,
    votingParams = {},
    addVotingOptionDto = {},
    expectedVotingOptionParams = {},
    url,
    skipDbCheck = false,
    onBeforeTest = () => {},
  }: {
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN;
    expectedErrorMessage?: string[];
    broadcaster: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    votingParams?: Partial<Omit<Voting, 'userTypesParams'>> & {
      userTypesParams?: DeepPartial<UserTypesParams>;
    };
    addVotingOptionDto?: Partial<AddVotingOptionDto>;
    expectedVotingOptionParams?: Partial<VotingOption>;
    url?: string;
    skipDbCheck?: boolean;
    onBeforeTest?: OnBeforeTest<{ voting: Voting }>;
  }) => {
    const voting = await votingRepo.save({
      ...R.mergeDeepRight(
        { userTypesParams: votingUserTypesParamsForbidden },
        votingParams,
      ),
      user: broadcaster,
    });
    const finalAddVotingOptionDto: AddVotingOptionDto = {
      payload: {
        type: VotingOptionType.Custom,
        title: 'Test VotingOption',
      },
      ...addVotingOptionDto,
    };
    const expectedVotingOption = {
      ...defaultVotingOptionParams,
      userId: broadcaster.id,
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
      ...expectedVotingOptionParams,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting });

    const finalUrl =
      url || `${API_BASE}/${broadcaster.id}/voting/${voting.id}/option`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(finalAddVotingOptionDto)
        .expect(expectedStatusCode)
        .expect((response) =>
          expect(response.body).toEqual(expectedVotingOption),
        );

      if (!skipDbCheck) {
        expect(
          await votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toEqual(expectedVotingOption);
      }
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(finalAddVotingOptionDto)
        .expect(expectedStatusCode)
        .expect(
          expectedErrorMessage
            ? {
                statusCode: 400,
                message: expectedErrorMessage,
                error: 'Bad Request',
              }
            : { statusCode: 400, message: 'Bad Request' },
        );

      if (!skipDbCheck) {
        expect(
          await votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(finalAddVotingOptionDto)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      if (!skipDbCheck) {
        expect(
          await votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toBeUndefined();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  const testDeleteVotingOption = async ({
    expectedStatusCode,
    broadcaster,
    author,
    initiator,
    initiatorTypes,
    votingParams = {},
    url,
    onBeforeTest = () => {},
  }: {
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN;
    broadcaster: User;
    author: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    votingParams?: Partial<Voting>;
    url?: string;
    onBeforeTest?: OnBeforeTest<{ voting: Voting; votingOption: VotingOption }>;
  }) => {
    const voting = await votingRepo.save({
      user: broadcaster,
      userTypesParams: votingUserTypesParamsForbidden,
      ...votingParams,
    });
    const votingOption = await votingOptionRepo.save({
      user: author,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    });
    const expectedVotingOption = {
      ...defaultVotingOptionParams,
      id: votingOption.id,
      userId: author.id,
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption });

    const finalUrl =
      url ||
      `${API_BASE}/${broadcaster.id}/voting/${voting.id}/option/${votingOption.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(await votingOptionRepo.findOne(votingOption.id)).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await votingOptionRepo.findOne(votingOption.id)).toEqual(
        expectedVotingOption,
      );
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  const testCreateVote = async ({
    expectedStatusCode,
    broadcaster,
    votingOptionAuthor,
    initiator,
    initiatorTypes,
    votingParams = {},
    skipDbCheck,
    url,
    onBeforeTest = () => {},
  }: {
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN;
    broadcaster: User;
    votingOptionAuthor: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    votingParams?: Partial<Omit<Voting, 'userTypesParams'>> & {
      userTypesParams?: DeepPartial<UserTypesParams>;
    };
    skipDbCheck?: boolean;
    url?: string;
    onBeforeTest?: OnBeforeTest<{ voting: Voting; votingOption: VotingOption }>;
  }) => {
    const voting = await votingRepo.save({
      ...R.mergeDeepRight(
        { userTypesParams: votingUserTypesParamsForbidden },
        votingParams,
      ),
      user: broadcaster,
    });
    const votingOption = await votingOptionRepo.save({
      user: votingOptionAuthor,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    });
    const expectedVote = {
      ...defaultVoteParams,
      userId: initiator.id,
      votingId: voting.id,
      votingOptionId: votingOption.id,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption });

    const finalUrl =
      url ||
      `${API_BASE}/${broadcaster.id}/voting/${voting.id}/option/${votingOption.id}/vote`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(
        await voteRepo.findOne({ where: { user: { id: initiator.id } } }),
      ).toEqual(expectedVote);
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 400, message: 'Bad Request' });

      if (!skipDbCheck) {
        expect(
          await voteRepo.findOne({ where: { user: { id: initiator.id } } }),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      if (!skipDbCheck) {
        expect(
          await voteRepo.findOne({ where: { user: { id: initiator.id } } }),
        ).toBeUndefined();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  const testDeleteVote = async ({
    expectedStatusCode,
    broadcaster,
    votingOptionAuthor,
    voteAuthor,
    initiator,
    initiatorTypes,
    votingParams = {},
    url,
    onBeforeTest = () => {},
  }: {
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN;
    broadcaster: User;
    votingOptionAuthor: User;
    voteAuthor: User;
    initiator: User;
    initiatorTypes?: UserTypes;
    votingParams?: Partial<Omit<Voting, 'userTypesParams'>> & {
      userTypesParams?: DeepPartial<UserTypesParams>;
    };
    url?: string;
    onBeforeTest?: OnBeforeTest<{
      voting: Voting;
      votingOption: VotingOption;
      vote: Vote;
    }>;
  }) => {
    const voting = await votingRepo.save({
      ...R.mergeDeepRight(
        { userTypesParams: votingUserTypesParamsForbidden },
        votingParams,
      ),
      user: broadcaster,
    });
    const votingOption = await votingOptionRepo.save({
      user: votingOptionAuthor,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
      fullVotesValue: 1,
    });
    const vote = await voteRepo.save({
      user: voteAuthor,
      voting,
      votingOption,
    });
    const expectedVote = {
      ...defaultVoteParams,
      userId: voteAuthor.id,
      votingId: voting.id,
      votingOptionId: votingOption.id,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption, vote });

    const finalUrl =
      url ||
      `${API_BASE}/${broadcaster.id}/voting/${voting.id}/option/${votingOption.id}/vote/${vote.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(await voteRepo.findOne(vote.id)).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await voteRepo.findOne(vote.id)).toEqual(expectedVote);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({ envFilePath: '.env.test' }),
        typeOrmPostgresModule,
        HoneyVotesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    connection = moduleFixture
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();

    userRepo = connection.getRepository(User);
    votingRepo = connection.getRepository(Voting);
    votingOptionRepo = connection.getRepository(VotingOption);
    voteRepo = connection.getRepository(Vote);

    configService = app.get<ConfigService<Config>>(ConfigService);
    jwtService = app.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    const tableNames = [
      USER_TABLE_NAME,
      VOTING_TABLE_NAME,
      VOTING_OPTION_TABLE_NAME,
      VOTE_TABLE_NAME,
    ];

    await connection.query(`TRUNCATE ${tableNames.join(',')} CASCADE;`);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('/channel-id/:channelName (GET)', () => {
    it('should return channelId by channelName', async () => {
      const [user] = await userRepo.save(users);

      return request(app.getHttpServer())
        .get(`${API_BASE}/channel-id/${user.login}`)
        .expect(200)
        .expect({ channelId: user.id });
    });

    it('should return 404 if channel is not exists', async () => {
      return request(app.getHttpServer())
        .get(`${API_BASE}/channel-id/1`)
        .expect(404)
        .expect({ statusCode: 404, message: 'Not Found' });
    });
  });

  describe('Voting', () => {
    describe('/:channelId/voting (GET)', () => {
      it('should return voting list', async () => {
        const [user] = await userRepo.save(users);

        await votingRepo.save({ user, title: 'Test Voting 1' });
        await votingRepo.save({ user, title: 'Test Voting 2' });

        return request(app.getHttpServer())
          .get(`${API_BASE}/${user.id}/voting`)
          .expect(200)
          .expect((response) =>
            expect(response.body).toEqual([
              { ...defaultVotingParams, title: 'Test Voting 2' },
              { ...defaultVotingParams, title: 'Test Voting 1' },
            ]),
          );
      });

      it('should empty array if channelId is not exists', async () => {
        return request(app.getHttpServer())
          .get(`${API_BASE}/${POSTGRES_MAX_INTEGER}/voting`)
          .expect(200)
          .expect((response) => expect(response.body).toEqual([]));
      });
    });

    describe('/:channelId/voting/:votingId (GET)', () => {
      it('should return Voting by id', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user, title: 'Test Voting' });

        return request(app.getHttpServer())
          .get(`${API_BASE}/${user.id}/voting/${voting.id}`)
          .expect(200)
          .expect((response) =>
            expect(response.body).toEqual({
              ...defaultVotingParams,
              id: voting.id,
              title: 'Test Voting',
            }),
          );
      });

      it('should return 404 if channelId is not exists', async () => {});

      it('should return 404 if Voting is not exists', async () => {});

      it('should return 403 if Voting is not assigned to this channelId', async () => {});
    });

    describe('/:channelId/voting (POST)', () => {
      // permissions
      it('should create Voting by broadcaster', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
        });
      });

      it('should create Voting by editors', async () => {
        const [user, editor] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not create Voting by other users', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: viewer,
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting`,
        });
      });

      // dto validation
      test('with required params', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: {},
        });
      });

      // TODO: if there will be required params
      // test('without required params', async () => {});

      test('with non whitelisted params', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'property wrongField should not exist',
            'property anotherField should not exist',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { wrongField: 'test', anotherField: false } as any,
        });
      });

      test('title: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: { title: 'Test Voting' },
        });
      });

      test('title: invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'title must be shorter than or equal to 50 characters',
            'title must be a string',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { title: false } as any,
        });
      });

      test('title: too long', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            `title must be shorter than or equal to ${VOTING_TITLE_MAX_LENGTH} characters`,
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { title: Array(VOTING_TITLE_MAX_LENGTH + 2).join('0') },
        });
      });

      test('description: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: { description: 'This is test voting' },
        });
      });

      test('description: invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            `description must be shorter than or equal to ${VOTING_DESCRIPTION_MAX_LENGTH} characters`,
            'description must be a string',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { description: 123 } as any,
        });
      });

      test('description: too long', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            `description must be shorter than or equal to ${VOTING_DESCRIPTION_MAX_LENGTH} characters`,
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            description: Array(VOTING_DESCRIPTION_MAX_LENGTH + 2).join('0'),
          },
        });
      });

      test('canManageVotes: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: { canManageVotes: false },
        });
      });

      test('canManageVotes: invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: ['canManageVotes must be a boolean value'],
          broadcaster: user,
          initiator: user,
          addVotingDto: { canManageVotes: 'hello world' } as any,
        });
      });

      test('canManageVotingOptions: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: { canManageVotingOptions: false },
        });
      });

      test('canManageVotingOptions: invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'canManageVotingOptions must be a boolean value',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { canManageVotingOptions: 1 } as any,
        });
      });

      test('userTypesParams: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            userTypesParams: {
              [TwitchUserType.Mod]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Vip]: { canVote: true, canAddOptions: true },
              [TwitchUserType.SubTier1]: { canVote: true, canAddOptions: true },
              [TwitchUserType.SubTier2]: { canVote: true, canAddOptions: true },
              [TwitchUserType.SubTier3]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Follower]: {
                canVote: true,
                canAddOptions: false,
                minutesToFollowRequiredToVote: 20,
                minutesToFollowRequiredToAddOptions: 100,
              },
              [TwitchUserType.Viewer]: { canVote: true, canAddOptions: false },
            },
          },
        });
      });

      test('userTypesParams: invalid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'userTypesParams.follower.minutesToFollowRequiredToVote must not be less than 0',
            'userTypesParams.follower.minutesToFollowRequiredToVote must be an integer number',
            'userTypesParams.follower.minutesToFollowRequiredToAddOptions must not be less than 0',
            'userTypesParams.follower.minutesToFollowRequiredToAddOptions must be an integer number',
            'userTypesParams.viewer.canAddOptions must be a boolean value',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            userTypesParams: {
              [TwitchUserType.Mod]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Vip]: { canVote: true, canAddOptions: true },
              [TwitchUserType.SubTier1]: { canVote: true, canAddOptions: true },
              [TwitchUserType.SubTier2]: { canVote: true, canAddOptions: true },
              [TwitchUserType.SubTier3]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Follower]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Viewer]: { canVote: true },
            },
          } as any,
        });
      });

      test('allowedVotingOptionTypes: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            allowedVotingOptionTypes: [
              VotingOptionType.IgdbGame,
              VotingOptionType.KinopoiskMovie,
            ],
          },
        });
      });

      test('allowedVotingOptionTypes: invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'each value in allowedVotingOptionTypes must be a valid enum value',
            "All allowedVotingOptionTypes's elements must be unique",
            'allowedVotingOptionTypes must contain at least 1 elements',
            'allowedVotingOptionTypes must be an array',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { allowedVotingOptionTypes: false } as any,
        });
      });

      test('allowedVotingOptionTypes: empty array', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'allowedVotingOptionTypes must contain at least 1 elements',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { allowedVotingOptionTypes: [] },
        });
      });

      test('allowedVotingOptionTypes: duplicated values', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            "All allowedVotingOptionTypes's elements must be unique",
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            allowedVotingOptionTypes: [
              VotingOptionType.IgdbGame,
              VotingOptionType.IgdbGame,
            ],
          },
        });
      });

      test('allowedVotingOptionTypes: items with invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'each value in allowedVotingOptionTypes must be a valid enum value',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            allowedVotingOptionTypes: ['hello world', 1, false],
          } as any,
        });
      });

      test('votingOptionsLimit: valid', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
          addVotingDto: { votingOptionsLimit: 50 },
        });
      });

      test('votingOptionsLimit: invalid type', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'votingOptionsLimit must not be greater than 200',
            'votingOptionsLimit must not be less than 2',
            'votingOptionsLimit must be an integer number',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { votingOptionsLimit: 'wrong type' } as any,
        });
      });

      test('votingOptionsLimit: not integer', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            'votingOptionsLimit must be an integer number',
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { votingOptionsLimit: 10.5 },
        });
      });

      test('votingOptionsLimit: too low value', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            `votingOptionsLimit must not be less than ${VOTING_OPTIONS_LIMIT_MIN}`,
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { votingOptionsLimit: VOTING_OPTIONS_LIMIT_MIN - 1 },
        });
      });

      test('votingOptionsLimit: too high value', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVoting({
          expectedStatusCode: 400,
          expectedErrorMessage: [
            `votingOptionsLimit must not be greater than ${VOTING_OPTIONS_LIMIT_MAX}`,
          ],
          broadcaster: user,
          initiator: user,
          addVotingDto: { votingOptionsLimit: VOTING_OPTIONS_LIMIT_MAX + 1 },
        });
      });
    });

    describe('/:channelId/voting/:votingId (PUT)', () => {
      // permissions
      it('should update Voting by broadcaster', async () => {
        const [user] = await userRepo.save(users);

        await testUpdateVoting({
          expectedStatusCode: 200,
          broadcaster: user,
          initiator: user,
        });
      });

      it('should update Voting by editors', async () => {
        const [user, editor] = await userRepo.save(users);

        await testUpdateVoting({
          expectedStatusCode: 200,
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not update Voting by other users', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testUpdateVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: viewer,
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });

        await testUpdateVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${voting.id}`,
        });
      });

      it('should return 403 if Voting is not exists', async () => {
        const [user] = await userRepo.save(users);

        await testUpdateVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Voting is assigned to this channelId', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting = await votingRepo.save({ user: user2 });

        await testUpdateVoting({
          expectedStatusCode: 403,
          broadcaster: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting.id}`,
        });
      });

      it('should return 403 if channelId and Voting are not exist', async () => {
        const [user] = await userRepo.save(users);

        await testUpdateVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      // dto validation
      // TODO
    });

    describe('/:channelId/voting/:votingId (DELETE)', () => {
      // permissions
      it('should delete Voting by broadcaster', async () => {
        const [user] = await userRepo.save(users);

        await testDeleteVoting({
          expectedStatusCode: 200,
          broadcaster: user,
          initiator: user,
        });
      });

      it('should delete Voting by editors', async () => {
        const [user, editor] = await userRepo.save(users);

        await testDeleteVoting({
          expectedStatusCode: 200,
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not delete Voting by other users', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: viewer,
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });

        await testDeleteVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${voting.id}`,
        });
      });

      it('should return 403 if Voting is not exists', async () => {
        const [user] = await userRepo.save(users);

        await testDeleteVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting = await votingRepo.save({ user: user2 });

        await testDeleteVoting({
          expectedStatusCode: 403,
          broadcaster: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting.id}`,
        });
      });

      it('should return 403 if channelId and Voting are not exist', async () => {
        const [user] = await userRepo.save(users);

        await testDeleteVoting({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      // logic
      it('should delete assigned VotingOptions and Votes', async () => {
        const [user, viewer1, viewer2, viewer3, viewer4] = await userRepo.save(
          users,
        );

        await testDeleteVoting({
          expectedStatusCode: 200,
          broadcaster: user,
          initiator: user,
          onBeforeTest: async ({ voting }) => {
            const [votingOption1, votingOption2] = await votingOptionRepo.save([
              {
                user: viewer1,
                voting,
                type: VotingOptionType.Custom,
                cardTitle: 'Test VotingOption 1',
              },
              {
                user: viewer2,
                voting,
                type: VotingOptionType.Custom,
                cardTitle: 'Test VotingOption 2',
              },
            ]);

            const [vote1, vote2, vote3, vote4] = await voteRepo.save([
              {
                user: viewer2,
                voting,
                votingOption: votingOption1,
                value: 1,
              },
              {
                user: viewer2,
                voting,
                votingOption: votingOption1,
                value: 1,
              },
              {
                user: viewer3,
                voting,
                votingOption: votingOption1,
                value: 1,
              },
              {
                user: viewer4,
                voting,
                votingOption: votingOption2,
                value: 1,
              },
            ]);

            return async () => {
              expect(
                await votingOptionRepo.findOne(votingOption1.id),
              ).toBeUndefined();
              expect(
                await votingOptionRepo.findOne(votingOption2.id),
              ).toBeUndefined();

              expect(await voteRepo.findOne(vote1.id)).toBeUndefined();
              expect(await voteRepo.findOne(vote2.id)).toBeUndefined();
              expect(await voteRepo.findOne(vote3.id)).toBeUndefined();
              expect(await voteRepo.findOne(vote4.id)).toBeUndefined();
            };
          },
        });
      });
    });
  });

  describe('VotingOption', () => {
    describe('/:channelId/voting/:votingId/option (POST)', () => {
      // permissions
      it('should always create VotingOption by broadcaster', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: user,
        });
      });

      it('should always create VotingOption by editors', async () => {
        const [user, editor] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should create VotingOption by mods', async () => {
        const [user, moderator] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Mod]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by mods', async () => {
        const [user, moderator] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
        });
      });

      // TODO: vips
      // it('should create VotingOption by vips', async () => {});
      // it('should not create VotingOption by vips', async () => {});

      it('should create VotingOption by subTier1', async () => {
        const [user, subTier1] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.t1 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.SubTier1]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by subTier1', async () => {
        const [user, subTier1] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.t1 },
        });
      });

      it('should create VotingOption by subTier2', async () => {
        const [user, subTier2] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.t2 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.SubTier2]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by subTier2', async () => {
        const [user, subTier2] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.t2 },
        });
      });

      it('should create VotingOption by subTier3', async () => {
        const [user, subTier3] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.t3 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.SubTier3]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by subTier3', async () => {
        const [user, subTier3] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.t3 },
        });
      });

      it('should create VotingOption by any follower', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Follower]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by any follower', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
        });
      });

      it('should create VotingOption by follower with required minutes to follow', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 120 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Follower]: {
                canAddOptions: true,
                minutesToFollowRequiredToAddOptions: 60,
              },
            },
          },
        });
      });

      it('should not create VotingOption by follower without required minutes to follow', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 10 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Follower]: {
                canAddOptions: true,
                minutesToFollowRequiredToAddOptions: 60,
              },
            },
          },
        });
      });

      it('should create VotingOption by any user', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 201,
          broadcaster: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Viewer]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by any user', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: viewer,
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${voting.id}/option`,
        });
      });

      it('should return 403 if Voting is not exists', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${POSTGRES_MAX_INTEGER}/option`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting = await votingRepo.save({ user: user2 });

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting.id}/option`,
        });
      });

      it('should return 403 if channelId and Voting are not exist', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option`,
        });
      });

      // dto validation
      describe('KinopoiskMovie', () => {
        // TODO: test api rate limits
        // dto validation
        it('with required fields', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption({
            expectedStatusCode: 201,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.KinopoiskMovie, id: movieId },
            },
            expectedVotingOptionParams: {
              type: VotingOptionType.KinopoiskMovie,
              cardId: movieId,
              cardTitle: expect.any(String),
              cardDescription: expect.any(String),
              cardImageUrl: expect.any(String),
              cardUrl: expect.any(String),
            },
          });
        });

        it('without required fields', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              'payload.id must be a positive number',
              'payload.id must be an integer number',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.KinopoiskMovie },
            } as any,
          });
        });

        it('id: invalid type', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              'payload.id must be a positive number',
              'payload.id must be an integer number',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.KinopoiskMovie, id: false },
            } as any,
          });
        });

        it('id: not integer', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: ['payload.id must be an integer number'],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.KinopoiskMovie,
                id: 371.5,
              },
            },
          });
        });

        it('id: non existing', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 1;

          mockGetFilmData(movieId, '', { statusCode: 404 });

          await testCreateVotingOption({
            expectedStatusCode: 400,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.KinopoiskMovie,
                id: movieId,
              },
            },
          });
        });

        // logic
        it('should not create VotingOption if its already exists with same id', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.KinopoiskMovie,
                id: movieId,
              },
            },
            skipDbCheck: true,
            onBeforeTest: async ({ voting }) => {
              await votingOptionRepo.save({
                user,
                voting,
                type: VotingOptionType.KinopoiskMovie,
                cardId: movieId,
                cardTitle: '',
                cardSubtitle: '',
                cardDescription: '',
                cardImageUrl: '',
                cardUrl: '',
              });
            },
          });
        });
      });

      describe('IgdbGame', () => {
        // TODO: test api rate limits
        // dto validation
        it('with required fields', async () => {
          const [user] = await userRepo.save(users);
          const gameId = 379;

          mockIgdbGames([game379]);

          await testCreateVotingOption({
            expectedStatusCode: 201,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.IgdbGame, id: gameId },
            },
            expectedVotingOptionParams: {
              type: VotingOptionType.IgdbGame,
              cardId: gameId,
              cardTitle: expect.any(String),
              cardDescription: expect.any(String),
              cardImageUrl: expect.any(String),
              cardUrl: expect.any(String),
            },
          });
        });

        it('without required fields', async () => {
          const [user] = await userRepo.save(users);

          mockIgdbGames([game379]);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              'payload.id must be a positive number',
              'payload.id must be an integer number',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.IgdbGame },
            } as any,
          });
        });

        it('id: invalid type', async () => {
          const [user] = await userRepo.save(users);

          mockIgdbGames([game379]);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              'payload.id must be a positive number',
              'payload.id must be an integer number',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.IgdbGame, id: false },
            } as any,
          });
        });

        it('id: not integer', async () => {
          const [user] = await userRepo.save(users);

          mockIgdbGames([game379]);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: ['payload.id must be an integer number'],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.IgdbGame,
                id: 379.5,
              },
            },
          });
        });

        it('id: non existing', async () => {
          const [user] = await userRepo.save(users);
          const movieId = 1;

          mockIgdbGames([]);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.IgdbGame,
                id: movieId,
              },
            },
          });
        });

        // logic
        it('should not create VotingOption if its already exists with same id', async () => {
          const [user] = await userRepo.save(users);
          const gameId = 379;

          mockIgdbGames([game379]);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.IgdbGame,
                id: gameId,
              },
            },
            skipDbCheck: true,
            onBeforeTest: async ({ voting }) => {
              await votingOptionRepo.save({
                user,
                voting,
                type: VotingOptionType.IgdbGame,
                cardId: gameId,
                cardTitle: '',
                cardSubtitle: '',
                cardDescription: '',
                cardImageUrl: '',
                cardUrl: '',
              });
            },
          });
        });
      });

      describe('Custom', () => {
        // dto validation
        it('with required fields', async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 201,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.Custom,
                title: 'Test VotingOption',
              },
            },
            expectedVotingOptionParams: {
              type: VotingOptionType.Custom,
              cardTitle: 'Test VotingOption',
            },
          });
        });

        it('without required fields', async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              `payload.title must be shorter than or equal to ${VOTING_OPTION_CARD_TITLE_MAX_LENGTH} characters`,
              'payload.title must be a string',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.Custom },
            } as any,
          });
        });

        it('title: invalid type', async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              `payload.title must be shorter than or equal to ${VOTING_OPTION_CARD_TITLE_MAX_LENGTH} characters`,
              'payload.title must be a string',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: { type: VotingOptionType.Custom, title: 123 },
            } as any,
          });
        });

        it('title: too long', async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              'payload.title must be shorter than or equal to 50 characters',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.Custom,
                title: Array(VOTING_OPTION_CARD_TITLE_MAX_LENGTH + 2).join('0'),
              },
            },
          });
        });

        it('description: invalid type', async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              `payload.description must be shorter than or equal to ${VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH} characters`,
              'payload.description must be a string',
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.Custom,
                title: 'Test VotingOption',
                description: false,
              } as any,
            },
          });
        });

        it('description: too long', async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            expectedErrorMessage: [
              `payload.description must be shorter than or equal to ${VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH} characters`,
            ],
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.Custom,
                title: 'Test VotingOption',
                description: Array(
                  VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH + 2,
                ).join('0'),
              },
            },
          });
        });

        // logic
        it("should not create VotingOption if it's already exists with same title", async () => {
          const [user] = await userRepo.save(users);

          await testCreateVotingOption({
            expectedStatusCode: 400,
            broadcaster: user,
            initiator: user,
            addVotingOptionDto: {
              payload: {
                type: VotingOptionType.Custom,
                title: 'Test VotingOption',
              },
            },
            skipDbCheck: true,
            onBeforeTest: async ({ voting }) => {
              await votingOptionRepo.save({
                user,
                voting,
                type: VotingOptionType.Custom,
                cardId: null,
                cardTitle: 'Test VotingOption',
                cardSubtitle: null,
                cardDescription: null,
                cardImageUrl: null,
                cardUrl: null,
              });
            },
          });
        });
      });

      // logic
      it('should not create VotingOption if canManageVotingOptions is disabled', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Viewer]: { canAddOptions: true },
            },
            canManageVotingOptions: false,
          },
        });
      });

      it('should not create VotingOption by broadcaster if limit is reached', async () => {});

      it('should not create VotingOption by editors if limit is reached', async () => {});

      it('should not create VotingOption by users if limit is reached', async () => {});
    });

    describe('/:channelId/voting/:votingId/option/:votingOptionId (DELETE)', () => {
      // permissions
      it('should delete any VotingOption by broadcaster', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 200,
          broadcaster: user,
          author: viewer,
          initiator: user,
        });
      });

      it('should delete any VotingOption by broadcaster if canManageVotingOptions is disabled', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 200,
          broadcaster: user,
          author: viewer,
          initiator: user,
          votingParams: { canManageVotingOptions: false },
        });
      });

      it('should delete any VotingOption by editors', async () => {
        const [user, viewer, editor] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 200,
          broadcaster: user,
          author: viewer,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should delete any VotingOption by editors if canManageVotingOptions is disabled', async () => {
        const [user, viewer, editor] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 200,
          broadcaster: user,
          author: viewer,
          initiator: editor,
          initiatorTypes: { isEditor: true },
          votingParams: { canManageVotingOptions: false },
        });
      });

      it('should not delete not own VotingOption', async () => {
        const [user, viewer1, viewer2] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: viewer1,
          initiator: viewer2,
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${voting.id}/option/${votingOption.id}`,
        });
      });

      it('should return 403 if Voting is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${POSTGRES_MAX_INTEGER}/option/${votingOption.id}`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting = await votingRepo.save({ user: user2 });
        const votingOption = await votingOptionRepo.save({
          user: user2,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user1,
          author: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting.id}/option/${votingOption.id}`,
        });
      });

      it('should return 403 if channelId and Voting are not exist', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${votingOption.id}`,
        });
      });

      it('should return 403 if VotingOption is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${voting.id}/option/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if VotingOption is not assigned to this Voting', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting1 = await votingRepo.save({ user: user2 });
        const voting2 = await votingRepo.save({ user: user2 });
        const votingOption = await votingOptionRepo.save({
          user: user2,
          voting: voting2,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user1,
          author: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting1.id}/option/${votingOption.id}`,
        });
      });

      it('should return 403 if channelId, Voting and VotingOption are not exist', async () => {
        const [user] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${POSTGRES_MAX_INTEGER}`,
        });
      });

      // logic
      it('should not delete own VotingOption if canManageVotingOptions is disabled', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: viewer,
          initiator: viewer,
          votingParams: { canManageVotingOptions: false },
        });
      });

      it('should delete own VotingOption if it has no votes', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 200,
          broadcaster: user,
          author: viewer,
          initiator: viewer,
        });
      });

      it('should not delete own VotingOption if it has votes', async () => {
        const [user, viewer1, viewer2] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 403,
          broadcaster: user,
          author: viewer1,
          initiator: viewer1,
          onBeforeTest: async ({ voting, votingOption }) => {
            await voteRepo.save({
              user: viewer2,
              voting,
              votingOption,
              value: 1,
            });
          },
        });
      });

      it('should delete assigned Votes when deleting VotingOption', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVotingOption({
          expectedStatusCode: 200,
          broadcaster: user,
          author: viewer,
          initiator: user,
          onBeforeTest: async ({ voting, votingOption }) => {
            const vote = await voteRepo.save({
              user: viewer,
              voting,
              votingOption,
              value: 1,
            });

            return async () => {
              expect(await voteRepo.findOne(vote.id)).toBeUndefined();
            };
          },
        });
      });
    });
  });

  describe('Vote', () => {
    describe('/:channelId/voting/:votingId/option/:votingOptionId/vote (POST)', () => {
      // permissions
      it('should always create Vote by broadcaster', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
        });
      });

      it('should always create Vote by editors', async () => {
        const [user, editor] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should create Vote by mods', async () => {
        const [user, moderator] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
          votingParams: {
            userTypesParams: { [TwitchUserType.Mod]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by mods', async () => {
        const [user, moderator] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
        });
      });

      // TODO: vips
      // it('should create Vote by vips', async () => {});
      // it('should not create Vote by vips', async () => {});

      it('should create Vote by subTier1', async () => {
        const [user, subTier1] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.t1 },
          votingParams: {
            userTypesParams: { [TwitchUserType.SubTier1]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by subTier1', async () => {
        const [user, subTier1] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.t1 },
        });
      });

      it('should create Vote by subTier2', async () => {
        const [user, subTier2] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.t2 },
          votingParams: {
            userTypesParams: { [TwitchUserType.SubTier2]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by subTier2', async () => {
        const [user, subTier2] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.t2 },
        });
      });

      it('should create Vote by subTier3', async () => {
        const [user, subTier3] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.t3 },
          votingParams: {
            userTypesParams: { [TwitchUserType.SubTier3]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by subTier3', async () => {
        const [user, subTier3] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.t3 },
        });
      });

      it('should create Vote by follower', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
          votingParams: {
            userTypesParams: { [TwitchUserType.Follower]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by follower', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
        });
      });

      it('should create Vote by follower with required minutes to follow', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 120 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Follower]: {
                canVote: true,
                minutesToFollowRequiredToVote: 60,
              },
            },
          },
        });
      });

      it('should not create Vote by follower without required minutes to follow', async () => {
        const [user, follower] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 10 },
          votingParams: {
            userTypesParams: {
              [TwitchUserType.Follower]: {
                canVote: true,
                minutesToFollowRequiredToVote: 60,
              },
            },
          },
        });
      });

      it('should create Vote by any user', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by any user', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'TestVoting',
        });

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${voting.id}/option/${votingOption.id}/vote`,
        });
      });

      it('should return 403 if Voting is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'TestVoting',
        });

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${POSTGRES_MAX_INTEGER}/option/${votingOption.id}/vote`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting = await votingRepo.save({ user: user2 });
        const votingOption = await votingOptionRepo.save({
          user: user2,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'TestVoting',
        });

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user1,
          votingOptionAuthor: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting.id}/option/${votingOption.id}/vote`,
        });
      });

      it('should return 403 if channelId and Voting are not exist', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'TestVoting',
        });

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${votingOption.id}/vote`,
        });
      });

      it('should return 403 if VotingOption is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          url: `${API_BASE}/${user.id}/voting/${voting.id}/option/${POSTGRES_MAX_INTEGER}/vote`,
        });
      });

      it('should return 403 if VotingOption is not assigned to this Voting', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting1 = await votingRepo.save({ user: user1 });
        const voting2 = await votingRepo.save({ user: user2 });
        const votingOption = await votingOptionRepo.save({
          user: user2,
          voting: voting2,
          type: VotingOptionType.Custom,
          cardTitle: 'TestVoting',
        });

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user1,
          votingOptionAuthor: user1,
          initiator: user1,
          url: `${API_BASE}/${user1.id}/voting/${voting1.id}/option/${votingOption.id}/vote`,
        });
      });

      it('should return 403 if channelId, Voting and VotingOption are not exist', async () => {
        const [user] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${POSTGRES_MAX_INTEGER}/vote`,
        });
      });

      // logic
      it('should not create Vote if canManageVotes is disabled', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
            canManageVotes: false,
          },
        });
      });

      it('should update fullVotesValue for VotingOption if it is the first vote', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest:
            async ({ votingOption }) =>
            async () => {
              expect(
                await votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 1 });
            },
        });
      });

      it('should update fullVotesValue for VotingOption if it is not the first vote', async () => {
        const [user, viewer1, viewer2, viewer3] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ voting, votingOption }) => {
            await voteRepo.save([
              { user: viewer2, voting, votingOption },
              { user: viewer3, voting, votingOption },
            ]);
            await votingOptionRepo.save({ ...votingOption, fullVotesValue: 2 });

            return async () => {
              expect(
                await votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 3 });
            };
          },
        });
      });

      it('should not create Vote for one VotingOption for the same user twice', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 400,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          skipDbCheck: true,
          onBeforeTest: async ({ voting, votingOption }) => {
            await voteRepo.save({ user: viewer, voting, votingOption });
            await votingOptionRepo.save({ ...votingOption, fullVotesValue: 1 });

            return async () => {
              expect(await voteRepo.count({ where: { user: viewer.id } })).toBe(
                1,
              );
            };
          },
        });
      });

      it('should remove old Vote if user voted for the new VotingOption', async () => {
        const [user, viewer1, viewer2] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ voting }) => {
            const votingOption2 = await votingOptionRepo.save({
              user: viewer2,
              voting,
              type: VotingOptionType.Custom,
              cardTitle: 'Test VotingOption',
            });
            const vote2 = await voteRepo.save({
              user: viewer1,
              voting,
              votingOption: votingOption2,
            });

            return async () => {
              expect(await voteRepo.findOne(vote2.id)).toBeUndefined();
            };
          },
        });
      });

      it('should update fullVotesValue for old and new VotingOption if user voted for the new VotingOption', async () => {
        const [user, viewer1, viewer2] = await userRepo.save(users);

        await testCreateVote({
          expectedStatusCode: 201,
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ voting, votingOption }) => {
            const votingOption2 = await votingOptionRepo.save({
              user: viewer2,
              voting,
              type: VotingOptionType.Custom,
              cardTitle: 'Test VotingOption',
              fullVotesValue: 1,
            });
            await voteRepo.save({
              user: viewer1,
              voting,
              votingOption: votingOption2,
            });

            return async () => {
              expect(
                await votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 1 });
              expect(
                await votingOptionRepo.findOne(votingOption2.id),
              ).toMatchObject({ fullVotesValue: 0 });
            };
          },
        });
      });
    });

    describe('/:channelId/voting/:votingId/option/:votingOptionId/vote/:voteId (DELETE)', () => {
      // remissions
      it('should delete Vote by author', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVote({
          expectedStatusCode: 200,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });

      it('should not delete Vote not by author', async () => {
        const [user, viewer1, viewer2] = await userRepo.save(users);

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer1,
          initiator: viewer2,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });

      // request validation
      it('should return 403 if channelId is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({ user, voting, votingOption });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${voting.id}/option/${votingOption.id}/vote/${vote.id}`,
        });
      });

      it('should return 403 if Voting is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({ user, voting, votingOption });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${user.id}/voting/${POSTGRES_MAX_INTEGER}/option/${votingOption.id}/vote/${vote.id}`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting = await votingRepo.save({ user: user2 });
        const votingOption = await votingOptionRepo.save({
          user: user2,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({ user: user2, voting, votingOption });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user1,
          votingOptionAuthor: user1,
          voteAuthor: user1,
          initiator: user1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${user1.id}/voting/${voting.id}/option/${votingOption.id}/vote/${vote.id}`,
        });
      });

      it('should return 403 if channelId and Voting are not exist', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({ user, voting, votingOption });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${votingOption.id}/vote/${vote.id}`,
        });
      });

      it('should return 403 if VotingOption is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({ user, voting, votingOption });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${user.id}/voting/${voting.id}/option/${POSTGRES_MAX_INTEGER}/vote/${vote.id}`,
        });
      });

      it('should return 403 if VotingOption is not assigned to this Voting', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting1 = await votingRepo.save({ user: user1 });
        const voting2 = await votingRepo.save({ user: user2 });
        const votingOption = await votingOptionRepo.save({
          user: user2,
          voting: voting2,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({
          user: user2,
          voting: voting2,
          votingOption,
        });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user1,
          votingOptionAuthor: user1,
          voteAuthor: user1,
          initiator: user1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${user1.id}/voting/${voting1.id}/option/${votingOption.id}/vote/${vote.id}`,
        });
      });

      it('should return 403 if channelId, Voting and VotingOption are not exist', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({ user, voting, votingOption });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${POSTGRES_MAX_INTEGER}/vote/${vote.id}`,
        });
      });

      it('should return 403 if Vote is not exists', async () => {
        const [user] = await userRepo.save(users);
        const voting = await votingRepo.save({ user });
        const votingOption = await votingOptionRepo.save({
          user,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${user.id}/voting/${voting.id}/option/${votingOption.id}/vote/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Vote is not assigned to this VotingOption', async () => {
        const [user1, user2] = await userRepo.save(users);
        const voting1 = await votingRepo.save({ user: user1 });
        const votingOption1 = await votingOptionRepo.save({
          user: user1,
          voting: voting1,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const voting2 = await votingRepo.save({ user: user2 });
        const votingOption2 = await votingOptionRepo.save({
          user: user2,
          voting: voting2,
          type: VotingOptionType.Custom,
          cardTitle: 'Test VotingOption',
        });
        const vote = await voteRepo.save({
          user: user2,
          voting: voting2,
          votingOption: votingOption2,
        });

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user1,
          votingOptionAuthor: user1,
          voteAuthor: user1,
          initiator: user1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${user1.id}/voting/${voting1.id}/option/${votingOption1.id}/vote/${vote.id}`,
        });
      });

      it('should return 403 if channelId, Voting, VotingOption and Vote are not exist', async () => {
        const [user] = await userRepo.save(users);

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/${POSTGRES_MAX_INTEGER}/voting/${POSTGRES_MAX_INTEGER}/option/${POSTGRES_MAX_INTEGER}/vote/${POSTGRES_MAX_INTEGER}`,
        });
      });

      // logic
      it('should not delete Vote if canManageVotes is disabled', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVote({
          expectedStatusCode: 403,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
            canManageVotes: false,
          },
        });
      });

      it('should update fullVotesValue for VotingOption', async () => {
        const [user, viewer] = await userRepo.save(users);

        await testDeleteVote({
          expectedStatusCode: 200,
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ votingOption }) => {
            return async () => {
              expect(
                await votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 0 });
            };
          },
        });
      });
    });
  });
});
