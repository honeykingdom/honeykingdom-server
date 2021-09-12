import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Repository } from 'typeorm';
import { Config } from '../../../src/config/config.interface';
import { DatabaseModule } from '../../../src/database/database.module';
import { DatabaseService } from '../../../src/database/database.service';
import { ChatVote } from '../../../src/honey-votes/chat-votes/entities/ChatVote.entity';
import { ChatVoting } from '../../../src/honey-votes/chat-votes/entities/ChatVoting.entity';
import { HoneyVotesModule } from '../../../src/honey-votes/honey-votes.module';
import { User } from '../../../src/honey-votes/users/entities/User.entity';
import { UserCredentials } from '../../../src/honey-votes/users/entities/UserCredentials.entity';
import { Vote } from '../../../src/honey-votes/votes/entities/Vote.entity';
import { Voting } from '../../../src/honey-votes/votes/entities/Voting.entity';
import { VotingOption } from '../../../src/honey-votes/votes/entities/VotingOption.entity';
import { TwitchChatModule } from '../../../src/twitch-chat/twitch-chat.module';
import { typeOrmPostgresModule } from '../../../src/typeorm';
import { twitchChatServiceMock } from '../chat-votes.e2e-spec';
import { createGetAuthorizationHeader } from './createGetAuthorizationHeader';
import { transformMockUserToDbUser } from './transformMockUserToDbUser';
import { MockUser, users } from './users';

export type HoneyVotesTestContext = {
  app: INestApplication;
  connection: Connection;
  userRepo: Repository<User>;
  votingRepo: Repository<Voting>;
  votingOptionRepo: Repository<VotingOption>;
  voteRepo: Repository<Vote>;
  chatVotingRepo: Repository<ChatVoting>;
  chatVoteRepo: Repository<ChatVote>;
  jwtService: JwtService;
  configService: ConfigService<Config>;
  getAuthorizationHeader: ReturnType<typeof createGetAuthorizationHeader>;
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
    ];

    await ctx.connection.query(`TRUNCATE ${tableNames.join(',')} CASCADE;`);
  });

  afterAll(async () => {
    await ctx.connection.close();
  });

  ctx.getAuthorizationHeader = createGetAuthorizationHeader(
    ctx.jwtService,
    ctx.configService,
  );

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
