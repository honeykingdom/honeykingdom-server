import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Repository } from 'typeorm';
import { Config } from '../../../src/config/config.interface';
import { DatabaseModule } from '../../../src/database/database.module';
import { DatabaseService } from '../../../src/database/database.service';
import { ChatGoalData } from '../../../src/honey-votes/chat-goal/entities/chat-goal-data.entity';
import { ChatGoalEvent } from '../../../src/honey-votes/chat-goal/entities/chat-goal-event.entity';
import { ChatGoal } from '../../../src/honey-votes/chat-goal/entities/chat-goal.entity';
import { ChatVote } from '../../../src/honey-votes/chat-votes/entities/chat-vote.entity';
import { ChatVoting } from '../../../src/honey-votes/chat-votes/entities/chat-voting.entity';
import { HoneyVotesModule } from '../../../src/honey-votes/honey-votes.module';
import { User } from '../../../src/honey-votes/users/entities/user.entity';
import { UserCredentials } from '../../../src/honey-votes/users/entities/user-credentials.entity';
import { Vote } from '../../../src/honey-votes/votes/entities/vote.entity';
import { Voting } from '../../../src/honey-votes/votes/entities/voting.entity';
import { VotingOption } from '../../../src/honey-votes/votes/entities/voting-option.entity';
import { TwitchChatModule } from '../../../src/twitch-chat/twitch-chat.module';
import { typeOrmPostgresModule } from '../../../src/typeorm';
import { signAccessToken, SignTokenOptions } from './auth';
import { transformMockUserToDbUser } from './transformMockUserToDbUser';
import { MockUser, users } from './users';

// TODO: get rid of this mock and maybe use fake twitch chat connection or the real one
export const twitchChatServiceMock = {
  addChatListener: jest.fn(),
  joinChannel: jest.fn(),
  partChannel: jest.fn(),
};

export type HoneyVotesTestContext = {
  app: INestApplication;
  connection: Connection;
  userRepo: Repository<User>;
  votingRepo: Repository<Voting>;
  votingOptionRepo: Repository<VotingOption>;
  voteRepo: Repository<Vote>;
  chatVotingRepo: Repository<ChatVoting>;
  chatVoteRepo: Repository<ChatVote>;
  chatGoalRepo: Repository<ChatGoal>;
  chatGoalEventRepo: Repository<ChatGoalEvent>;
  chatGoalDataRepo: Repository<ChatGoalData>;
  jwtService: JwtService;
  configService: ConfigService<Config>;
  getAuthorizationHeader: (
    user: Pick<MockUser, 'id' | 'login'>,
    signTokenOptions?: SignTokenOptions,
  ) => readonly [string, string];
  createUsers: (users?: MockUser[]) => Promise<User[]>;
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
    })
      .overrideProvider(TwitchChatModule)
      .useValue({})
      .overrideProvider('TwitchChatModuleAnonymous')
      .useValue(twitchChatServiceMock)
      .compile();

    ctx.app = moduleFixture.createNestApplication();

    await ctx.app.init();

    ctx.connection = moduleFixture
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();

    ctx.userRepo = ctx.connection.getRepository(User);
    ctx.votingRepo = ctx.connection.getRepository(Voting);
    ctx.votingOptionRepo = ctx.connection.getRepository(VotingOption);
    ctx.voteRepo = ctx.connection.getRepository(Vote);
    ctx.chatVotingRepo = ctx.connection.getRepository(ChatVoting);
    ctx.chatVoteRepo = ctx.connection.getRepository(ChatVote);
    ctx.chatGoalRepo = ctx.connection.getRepository(ChatGoal);
    ctx.chatGoalEventRepo = ctx.connection.getRepository(ChatGoalEvent);
    ctx.chatGoalDataRepo = ctx.connection.getRepository(ChatGoalData);

    // TODO: make this work
    // ctx.connection = ctx.app.get(getConnectionToken(POSTGRES_CONNECTION));
    // ctx.userRepo = moduleFixture.get(getRepositoryToken(User));
    // ctx.votingRepo = moduleFixture.get(getRepositoryToken(Voting));
    // ctx.votingOptionRepo = moduleFixture.get(getRepositoryToken(VotingOption));
    // ctx.voteRepo = moduleFixture.get(getRepositoryToken(Vote));

    ctx.configService = ctx.app.get<ConfigService<Config>>(ConfigService);
    ctx.jwtService = ctx.app.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    const tableNames = [
      UserCredentials.tableName,
      User.tableName,
      Voting.tableName,
      VotingOption.tableName,
      Vote.tableName,
      ChatGoal.tableName,
      ChatGoalEvent.tableName,
      ChatGoalData.tableName,
    ];

    await ctx.connection.query(`TRUNCATE ${tableNames.join(',')} CASCADE;`);
  });

  afterAll(async () => {
    await ctx.connection.close();
  });

  ctx.getAuthorizationHeader = (
    { id, login }: Pick<MockUser, 'id' | 'login'>,
    signTokenOptions?: SignTokenOptions,
  ) =>
    [
      'Authorization',
      `Bearer ${signAccessToken(
        { sub: id, login },
        ctx.jwtService,
        ctx.configService,
        signTokenOptions,
      )}`,
    ] as const;

  ctx.createUsers = (allUsers = users) =>
    ctx.userRepo.save(
      allUsers.map(
        transformMockUserToDbUser(
          ctx.configService.get('HONEY_VOTES_CRYPTO_SECRET'),
        ),
      ),
    );

  return ctx;
};
