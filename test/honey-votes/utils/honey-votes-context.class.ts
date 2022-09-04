import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  getEntityManagerToken,
  getRepositoryToken,
  TypeOrmModule,
} from '@nestjs/typeorm';
import cacheManager from 'cache-manager';
import { EntityManager, Repository } from 'typeorm';
import { TwitchChatService } from '../../../src/twitch-chat/twitch-chat.service';
import { Config } from '../../../src/config/config.interface';
import { IgdbApiOptions } from '../../../src/igdb-api/entities/igdb-api-options.entity';
import { honeyVotesEntities } from '../../../src/honey-votes/honey-votes.entities';
import { HoneyVotesModule } from '../../../src/honey-votes/honey-votes.module';
import { ChatGoalData } from '../../../src/honey-votes/chat-goal/entities/chat-goal-data.entity';
import { ChatGoalEvent } from '../../../src/honey-votes/chat-goal/entities/chat-goal-event.entity';
import { ChatGoal } from '../../../src/honey-votes/chat-goal/entities/chat-goal.entity';
import { ChatVote } from '../../../src/honey-votes/chat-votes/entities/chat-vote.entity';
import { ChatVoting } from '../../../src/honey-votes/chat-votes/entities/chat-voting.entity';
import { UserCredentials } from '../../../src/honey-votes/users/entities/user-credentials.entity';
import { User } from '../../../src/honey-votes/users/entities/user.entity';
import { Vote } from '../../../src/honey-votes/votes/entities/vote.entity';
import { VotingOption } from '../../../src/honey-votes/votes/entities/voting-option.entity';
import { Voting } from '../../../src/honey-votes/votes/entities/voting.entity';
import { signAccessToken, SignTokenOptions } from './auth';
import { transformMockUserToDbUser } from './transformMockUserToDbUser';
import { MockUser, users } from './users';

const CONFIG: Partial<Config> = {
  HONEY_VOTES_BASE_URL: 'http://localhost:3000',
  HONEY_VOTES_FRONTEND_BASE_URL: 'http://localhost:3001',
  HONEY_VOTES_ACCESS_TOKEN_SECRET: '00000000000000000000000000000000',
  HONEY_VOTES_ACCESS_TOKEN_EXPIRE_TIME: '30 days',
  HONEY_VOTES_REFRESH_TOKEN_SECRET: '0000000000000000000000000000000',
  HONEY_VOTES_REFRESH_TOKEN_EXPIRE_TIME: '1 year',
  HONEY_VOTES_TWITCH_CLIENT_ID: '00000000000000000000000000000',
  HONEY_VOTES_TWITCH_CLIENT_SECRET: '000000000000000000000000000000',
  HONEY_VOTES_CRYPTO_SECRET: '00000000000000000000000000000000',

  KINOPOISK_API_KEY: '00000000000000000000000000000000',
};

export const twitchChatServiceMock: Partial<TwitchChatService> = {
  join: jest.fn(),
  part: jest.fn(),
  say: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
};

jest.mock('../../../src/twitch-chat/twitch-chat.service.ts', () => ({
  TwitchChatService: jest.fn().mockImplementation(() => twitchChatServiceMock),
}));

jest.spyOn(cacheManager, 'caching').mockImplementation(() => ({
  set: jest.fn(),
  wrap: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
  store: null,
}));

class HoneyVotesContext {
  app: INestApplication;
  entityManager: EntityManager;
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

  async create(): Promise<HoneyVotesContext> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ load: [() => CONFIG] }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: 'postgresql://postgres:postgres@localhost:5432/postgres',
          entities: [...honeyVotesEntities, IgdbApiOptions],
          synchronize: true,
          dropSchema: true,
          // https://stackoverflow.com/questions/58220333
          keepConnectionAlive: true,
        }),
        HoneyVotesModule,
      ],
    }).compile();

    this.app = moduleFixture.createNestApplication();

    await this.app.init();

    this.entityManager = this.app.get(getEntityManagerToken());
    this.userRepo = moduleFixture.get(getRepositoryToken(User));
    this.votingRepo = moduleFixture.get(getRepositoryToken(Voting));
    this.votingOptionRepo = moduleFixture.get(getRepositoryToken(VotingOption));
    this.voteRepo = moduleFixture.get(getRepositoryToken(Vote));
    this.chatVotingRepo = moduleFixture.get(getRepositoryToken(ChatVoting));
    this.chatVoteRepo = moduleFixture.get(getRepositoryToken(ChatVote));
    this.chatGoalRepo = moduleFixture.get(getRepositoryToken(ChatGoal));
    this.chatGoalEventRepo = moduleFixture.get(
      getRepositoryToken(ChatGoalEvent),
    );
    this.chatGoalDataRepo = moduleFixture.get(getRepositoryToken(ChatGoalData));

    this.configService = this.app.get<ConfigService<Config>>(ConfigService);
    this.jwtService = this.app.get<JwtService>(JwtService);

    return this;
  }

  clearTables() {
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

    return this.entityManager.query(
      `TRUNCATE ${tableNames.join(',')} CASCADE;`,
    );
  }

  destroy() {
    return this.app.close();
  }

  getAuthorizationHeader(
    { id, login }: Pick<MockUser, 'id' | 'login'>,
    signTokenOptions?: SignTokenOptions,
  ) {
    return [
      'Authorization',
      `Bearer ${signAccessToken(
        { sub: id, login },
        this.jwtService,
        this.configService,
        signTokenOptions,
      )}`,
    ] as const;
  }

  createUsers(allUsers = users) {
    return this.userRepo.save(
      allUsers.map(
        transformMockUserToDbUser(
          this.configService.get('HONEY_VOTES_CRYPTO_SECRET'),
        ),
      ),
    );
  }
}

export default HoneyVotesContext;
