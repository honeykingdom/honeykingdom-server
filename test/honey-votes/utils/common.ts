import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Repository } from 'typeorm';
import request from 'supertest';
import R from 'ramda';
import { Config } from '../../../src/config/config.interface';
import { DatabaseModule } from '../../../src/database/database.module';
import { DatabaseService } from '../../../src/database/database.service';
import { typeOrmPostgresModule } from '../../../src/db';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
  VotingOptionType,
} from '../../../src/honey-votes/honey-votes.interface';
import { HoneyVotesModule } from '../../../src/honey-votes/honey-votes.module';
import {
  User,
  USER_TABLE_NAME,
} from '../../../src/honey-votes/users/entities/User.entity';
import {
  Vote,
  VOTE_TABLE_NAME,
} from '../../../src/honey-votes/votes/entities/Vote.entity';
import {
  UserTypesParams,
  Voting,
  VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  VOTING_CAN_MANAGE_VOTES_DEFAULT,
  VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT,
  VOTING_OPTIONS_LIMIT_DEFAULT,
  VOTING_TABLE_NAME,
  VOTING_USER_TYPES_PARAMS_DEFAULT,
} from '../../../src/honey-votes/votes/entities/Voting.entity';
import {
  VotingOption,
  VOTING_OPTION_TABLE_NAME,
} from '../../../src/honey-votes/votes/entities/VotingOption.entity';
import { MockUser } from './users';
import {
  mockCheckUserSubscription,
  mockGetChannelEditors,
  mockGetModerators,
  mockGetUserFollows,
} from './mock-requests';
import { sub } from 'date-fns';
import { AddVotingDto } from '../../../src/honey-votes/votes/dto/addVotingDto';
import { UpdateVotingDto } from '../../../src/honey-votes/votes/dto/updateVotingDto';
import { AddVotingOptionDto } from '../../../src/honey-votes/votes/dto/addVotingOptionDto';
import { signAccessToken } from './auth';
import { AddVoteDto } from '../../../src/honey-votes/votes/dto/addVoteDto';
import { USER_CREDENTIALS_TABLE_NAME } from '../../../src/honey-votes/users/entities/UserCredentials.entity';

// https://stackoverflow.com/a/61132308/4687416
type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

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

// Voting

export const createTestCreateVoting =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      addVotingDto,
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      addVotingDto?: AddVotingDto;
    },
  ) => {
    const expectedVoting = {
      ...defaultVotingParams,
      ...R.omit(['channelId'], addVotingDto),
      userId: broadcaster.id,
    };

    const body: AddVotingDto = { channelId: broadcaster.id, ...addVotingDto };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    // const url = `${API_BASE}/voting`;

    // if (expectedStatusCode === HttpStatus.CREATED) {
    //   await request(ctx.app.getHttpServer())
    //     .post(url)
    //     .set('Authorization', ctx.getAuthorizationHeader(initiator))
    //     .send(body)
    //     .expect(expectedStatusCode)
    //     .expect((response) => expect(response.body).toEqual(expectedVoting));

    //   expect(
    //     await ctx.votingRepo.findOne({
    //       where: { user: { id: broadcaster.id } },
    //     }),
    //   ).toEqual(expectedVoting);
    // }

    // if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
    //   await request(ctx.app.getHttpServer())
    //     .post(url)
    //     .set('Authorization', ctx.getAuthorizationHeader(initiator))
    //     .send(body)
    //     .expect(expectedStatusCode)
    //     .expect({
    //       statusCode: 400,
    //       // message: expectedErrorMessage,
    //       error: 'Bad Request',
    //     });

    //   expect(
    //     await ctx.votingRepo.findOne({
    //       where: { user: { id: broadcaster.id } },
    //     }),
    //   ).toBeUndefined();
    // }

    // if (expectedStatusCode === HttpStatus.FORBIDDEN) {
    //   await request(ctx.app.getHttpServer())
    //     .post(url)
    //     .set('Authorization', ctx.getAuthorizationHeader(initiator))
    //     .send(body)
    //     .expect(expectedStatusCode)
    //     .expect({ statusCode: 403, message: 'Forbidden' });

    //   expect(
    //     await ctx.votingRepo.findOne({
    //       where: { user: { id: broadcaster.id } },
    //     }),
    //   ).toBeUndefined();
    // }

    // ---

    await request(ctx.app.getHttpServer())
      .post(`${API_BASE}/voting`)
      .set('Authorization', ctx.getAuthorizationHeader(initiator))
      .send(body)
      .expect(expectedStatusCode)
      .expect((response) => {
        if (expectedStatusCode === HttpStatus.CREATED) {
          expect(response.body).toEqual(expectedVoting);
        }

        if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.any(Array),
            error: 'Bad Request',
          });
        }

        if (expectedStatusCode === HttpStatus.FORBIDDEN) {
          expect(response.body).toEqual({
            statusCode: 403,
            message: 'Forbidden',
          });
        }
      });

    const dbVoting = await ctx.votingRepo.findOne({
      where: { user: { id: broadcaster.id } },
    });

    if (expectedStatusCode === HttpStatus.CREATED) {
      expect(dbVoting).toEqual(expectedVoting);
    }

    if (
      expectedStatusCode === HttpStatus.BAD_REQUEST ||
      expectedStatusCode === HttpStatus.FORBIDDEN
    ) {
      expect(dbVoting).toBeUndefined();
    }
  };

export const createTestUpdateVoting =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.CREATED | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      // updateVotingDto,
      initiatorTypes,
      url,
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      // updateVotingDto: UpdateVotingDto;
      url?: string;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      user: broadcaster,
      title: 'Test Voting',
    });

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const finalUrl = url || `${API_BASE}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      const updateVotingDto: UpdateVotingDto = { title: 'New Title' };
      const expectedVoting = {
        ...defaultVotingParams,
        ...updateVotingDto,
        userId: broadcaster.id,
      };

      await request(ctx.app.getHttpServer())
        .put(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(updateVotingDto)
        .expect(expectedStatusCode)
        .expect((response) => expect(response.body).toEqual(expectedVoting));

      expect(await ctx.votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      const updateVotingDto: UpdateVotingDto = { title: 'New Title' };
      const expectedVoting = {
        ...defaultVotingParams,
        userId: broadcaster.id,
        title: 'Test Voting',
      };

      await request(ctx.app.getHttpServer())
        .put(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(updateVotingDto)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await ctx.votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }
  };

export const createTestDeleteVoting =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      url,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      url?: string;
      onBeforeTest?: OnBeforeTest<{ voting: Voting }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      user: broadcaster,
      title: 'Test Voting',
    });
    const expectedVoting = {
      ...defaultVotingParams,
      title: 'Test Voting',
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting });

    const finalUrl = url || `${API_BASE}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(await ctx.votingRepo.findOne(voting.id)).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await ctx.votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

// VotingOption

export const createTestCreateVotingOption =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      votingParams = {},
      addVotingOptionDto = {},
      expectedVotingOptionParams = {},
      skipDbCheck = false,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Omit<Voting, 'userTypesParams'>> & {
        userTypesParams?: DeepPartial<UserTypesParams>;
      };
      addVotingOptionDto?: Partial<AddVotingOptionDto>;
      expectedVotingOptionParams?: Partial<VotingOption>;
      skipDbCheck?: boolean;
      onBeforeTest?: OnBeforeTest<{ voting: Voting }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      ...R.mergeDeepRight(
        { userTypesParams: votingUserTypesParamsForbidden },
        votingParams,
      ),
      user: broadcaster,
    });
    const body: AddVotingOptionDto = {
      payload: {
        type: VotingOptionType.Custom,
        title: 'Test VotingOption',
      },
      votingId: voting.id,
      ...addVotingOptionDto,
    };
    const expectedVotingOption = {
      ...defaultVotingOptionParams,
      userId: initiator.id,
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
      ...expectedVotingOptionParams,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting });

    const url = `${API_BASE}/voting-options`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect((response) =>
          expect(response.body).toEqual(expectedVotingOption),
        );

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toEqual(expectedVotingOption);
      }
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect((response) => {
          expect(response.body).toMatchObject({
            statusCode: 400,
            message: expect.anything(),
          });
        });

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toBeUndefined();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

export const createTestDeleteVotingOption =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      author,
      initiator,
      initiatorTypes,
      votingParams = {},
      url,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      author: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Voting>;
      url?: string;
      onBeforeTest?: OnBeforeTest<{
        voting: Voting;
        votingOption: VotingOption;
      }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      user: broadcaster,
      userTypesParams: votingUserTypesParamsForbidden,
      ...votingParams,
    });
    const votingOption = await ctx.votingOptionRepo.save({
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

    const finalUrl = url || `${API_BASE}/voting-options/${votingOption.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(
        await ctx.votingOptionRepo.findOne(votingOption.id),
      ).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await ctx.votingOptionRepo.findOne(votingOption.id)).toEqual(
        expectedVotingOption,
      );
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

// Vote

export const createTestCreateVote =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      votingOptionAuthor,
      initiator,
      initiatorTypes,
      votingParams = {},
      addVoteDto,
      skipDbCheck,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      votingOptionAuthor: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Omit<Voting, 'userTypesParams'>> & {
        userTypesParams?: DeepPartial<UserTypesParams>;
      };
      addVoteDto?: AddVoteDto;
      skipDbCheck?: boolean;
      onBeforeTest?: OnBeforeTest<{
        voting: Voting;
        votingOption: VotingOption;
      }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      ...R.mergeDeepRight(
        { userTypesParams: votingUserTypesParamsForbidden },
        votingParams,
      ),
      user: broadcaster,
    });
    const votingOption = await ctx.votingOptionRepo.save({
      user: votingOptionAuthor,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    });
    const body = {
      ...addVoteDto,
      votingOptionId: votingOption.id,
    };
    const expectedVote = {
      ...defaultVoteParams,
      userId: initiator.id,
      votingId: voting.id,
      votingOptionId: votingOption.id,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption });

    const url = `${API_BASE}/votes`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(
        await ctx.voteRepo.findOne({ where: { user: { id: initiator.id } } }),
      ).toEqual(expectedVote);
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect({ statusCode: 400, message: 'Bad Request' });

      if (!skipDbCheck) {
        expect(
          await ctx.voteRepo.findOne({ where: { user: { id: initiator.id } } }),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      if (!skipDbCheck) {
        expect(
          await ctx.voteRepo.findOne({ where: { user: { id: initiator.id } } }),
        ).toBeUndefined();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

export const createTestDeleteVote =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      votingOptionAuthor,
      voteAuthor,
      initiator,
      initiatorTypes,
      votingParams = {},
      url,
      onBeforeTest = () => {},
    }: {
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
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      ...R.mergeDeepRight(
        { userTypesParams: votingUserTypesParamsForbidden },
        votingParams,
      ),
      user: broadcaster,
    });
    const votingOption = await ctx.votingOptionRepo.save({
      user: votingOptionAuthor,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
      fullVotesValue: 1,
    });
    const vote = await ctx.voteRepo.save({
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

    const finalUrl = url || `${API_BASE}/votes/${vote.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ success: true });

      expect(await ctx.voteRepo.findOne(vote.id)).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await ctx.voteRepo.findOne(vote.id)).toEqual(expectedVote);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

type HoneyVotesTestContext = {
  app: INestApplication;
  connection: Connection;
  userRepo: Repository<User>;
  votingRepo: Repository<Voting>;
  votingOptionRepo: Repository<VotingOption>;
  voteRepo: Repository<Vote>;
  jwtService: JwtService;
  configService: ConfigService<Config>;
  getAuthorizationHeader: (user: MockUser) => string;
};

export const getHoneyVotesTestContext = () => {
  const ctx: HoneyVotesTestContext = {} as any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ConfigModule.forRoot({ envFilePath: '.env.test' }),
        typeOrmPostgresModule,
        HoneyVotesModule,
      ],
    }).compile();

    ctx.app = moduleFixture.createNestApplication();

    await ctx.app.init();

    ctx.connection = moduleFixture
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();

    ctx.userRepo = ctx.connection.getRepository(User);
    ctx.votingRepo = ctx.connection.getRepository(Voting);
    ctx.votingOptionRepo = ctx.connection.getRepository(VotingOption);
    ctx.voteRepo = ctx.connection.getRepository(Vote);

    ctx.configService = ctx.app.get<ConfigService<Config>>(ConfigService);
    ctx.jwtService = ctx.app.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    const tableNames = [
      USER_CREDENTIALS_TABLE_NAME,
      USER_TABLE_NAME,
      VOTING_TABLE_NAME,
      VOTING_OPTION_TABLE_NAME,
      VOTE_TABLE_NAME,
    ];

    await ctx.connection.query(`TRUNCATE ${tableNames.join(',')} CASCADE;`);
  });

  afterAll(async () => {
    await ctx.connection.close();
  });

  ctx.getAuthorizationHeader = ({ id, login }: MockUser) =>
    `Bearer ${signAccessToken(
      { sub: id, login },
      ctx.jwtService,
      ctx.configService,
    )}`;

  return ctx;
};
