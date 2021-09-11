import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Connection, Repository } from 'typeorm';
import { signAccessToken, SignTokenOptions } from './utils/auth';
import { MockUser, users } from './utils/users';
import { mockGetChannelEditors } from './utils/mock-requests';
import { OnBeforeTest } from './utils/common';
import { HoneyVotesModule } from '../../src/honey-votes/honey-votes.module';
import { User } from '../../src/honey-votes/users/entities/User.entity';
import { DatabaseModule } from '../../src/database/database.module';
import { typeOrmPostgresModule } from '../../src/typeorm';
import { DatabaseService } from '../../src/database/database.service';
import { Config } from '../../src/config/config.interface';
import {
  API_BASE,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.interface';
import { ChatVote } from '../../src/honey-votes/chat-votes/entities/ChatVote.entity';
import {
  ChatVoting,
  DEFAULT_CHAT_VOTING_RESTRICTIONS,
} from '../../src/honey-votes/chat-votes/entities/ChatVoting.entity';
import {
  AddChatVotingDto,
  ChatVotingRestrictions,
} from '../../src/honey-votes/chat-votes/dto/addChatVotingDto';
import { UpdateChatVotingDto } from '../../src/honey-votes/chat-votes/dto/updateChatVotingDto';
import { TwitchChatModule } from '../../src/twitch-chat/twitch-chat.module';

// TODO: get rid of this mock and maybe use fake twitch chat connection or the real one
export const twitchChatServiceMock = {
  addChatListener: jest.fn(),
  joinChannel: jest.fn(),
  partChannel: jest.fn(),
};

describe('HoneyVotes - ChatVotes (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userRepo: Repository<User>;
  let chatVotingRepo: Repository<ChatVoting>;
  let chatVoteRepo: Repository<ChatVote>;
  let configService: ConfigService<Config>;
  let jwtService: JwtService;

  const chatVotingRestrictionsForbidden: ChatVotingRestrictions = {
    [TwitchUserType.Viewer]: false,
    [TwitchUserType.SubTier1]: false,
    [TwitchUserType.SubTier2]: false,
    [TwitchUserType.SubTier3]: false,
    [TwitchUserType.Mod]: false,
    [TwitchUserType.Vip]: false,
    subMonthsRequired: 0,
  };

  const defaultChatVotingParams = {
    restrictions: DEFAULT_CHAT_VOTING_RESTRICTIONS,
    listening: false,
  };

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

  const testCreateChatVoting = async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      isEditor = false,
      addChatVotingDto,
    }: {
      broadcaster: User;
      initiator: User;
      isEditor?: boolean;
      addChatVotingDto?: AddChatVotingDto;
    },
  ) => {
    const expectedChatVoting = {
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      ...defaultChatVotingParams,
      ...addChatVotingDto,
    };

    mockGetChannelEditors(isEditor ? [initiator] : []);

    await request(app.getHttpServer())
      .post(`${API_BASE}/chat-votes`)
      .set('Authorization', getAuthorizationHeader(initiator))
      .send(addChatVotingDto)
      .expect(expectedStatusCode)
      .expect((response) => {
        if (expectedStatusCode === HttpStatus.CREATED) {
          expect(response.body).toEqual(expectedChatVoting);
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

    const chatVoting = await chatVotingRepo.findOne(broadcaster.id);

    if (expectedStatusCode === HttpStatus.CREATED) {
      expect(chatVoting).toEqual(expectedChatVoting);
    }

    if (
      expectedStatusCode === HttpStatus.BAD_REQUEST ||
      expectedStatusCode === HttpStatus.FORBIDDEN
    ) {
      expect(chatVoting).toBeUndefined();
    }
  };

  const testUpdateChatVoting = async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      isEditor = false,
      chatVotingParams = {},
      updateChatVotingDto,
      url,
    }: {
      broadcaster: User;
      initiator: User;
      isEditor?: boolean;
      chatVotingParams?: Partial<ChatVoting>;
      updateChatVotingDto: UpdateChatVotingDto;
      url?: string;
    },
  ) => {
    const chatVoting = await chatVotingRepo.save({
      broadcaster,
      ...chatVotingParams,
    } as ChatVoting);

    mockGetChannelEditors(isEditor ? [initiator] : []);

    const finalUrl =
      url || `${API_BASE}/chat-votes/${chatVoting.broadcasterId}`;

    if (expectedStatusCode === HttpStatus.OK) {
      const expectedChatVoting = {
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        ...defaultChatVotingParams,
        ...updateChatVotingDto,
        broadcasterId: broadcaster.id,
      };

      await request(app.getHttpServer())
        .put(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(updateChatVotingDto)
        .expect(expectedStatusCode)
        .expect((response) =>
          expect(response.body).toEqual(expectedChatVoting),
        );

      expect(await chatVotingRepo.findOne(chatVoting.broadcasterId)).toEqual(
        expectedChatVoting,
      );
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      const expectedChatVoting = {
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        ...defaultChatVotingParams,
        broadcasterId: broadcaster.id,
      };

      await request(app.getHttpServer())
        .put(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .send(updateChatVotingDto)
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await chatVotingRepo.findOne(chatVoting.broadcasterId)).toEqual(
        expectedChatVoting,
      );
    }
  };

  const testDeleteChatVoting = async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      isEditor = false,
      url,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      isEditor?: boolean;
      url?: string;
      onBeforeTest?: OnBeforeTest<{ chatVoting: ChatVoting }>;
    },
  ) => {
    const chatVoting = await chatVotingRepo.save({
      broadcaster,
    } as ChatVoting);
    const expectedVoting = {
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      ...defaultChatVotingParams,
      broadcasterId: broadcaster.id,
    };

    mockGetChannelEditors(isEditor ? [initiator] : []);

    const onAfterTest = await onBeforeTest({ chatVoting });

    const finalUrl = url || `${API_BASE}/chat-votes/${broadcaster.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await chatVotingRepo.findOne(chatVoting.broadcasterId),
      ).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .delete(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(await chatVotingRepo.findOne(chatVoting.broadcasterId)).toEqual(
        expectedVoting,
      );
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  const testClearChatVoting = async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      isEditor = false,
      url,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      isEditor?: boolean;
      url?: string;
      onBeforeTest?: OnBeforeTest<{ chatVoting: ChatVoting }>;
    },
  ) => {
    const chatVoting = await chatVotingRepo.save({
      broadcaster,
    } as ChatVoting);
    const chatVotingId = chatVoting.broadcasterId;

    const [chatVote1, chatVote2, chatVote3, chatVote4] =
      await chatVoteRepo.save(
        Array.from({ length: 4 }, (_, i) => ({
          chatVotingId,
          userId: `${i + 1}`,
          userName: `user${i + 1}`,
          tags: {},
          content: `Test Vote ${i + 1}`,
        })) as ChatVote[],
      );

    mockGetChannelEditors(isEditor ? [initiator] : []);

    const onAfterTest = await onBeforeTest({ chatVoting });

    const finalUrl = url || `${API_BASE}/chat-votes/${broadcaster.id}/clear`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await Promise.all([
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote1.userId }),
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote2.userId }),
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote3.userId }),
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote4.userId }),
        ]),
      ).toEqual(expect.arrayContaining([undefined]));
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(app.getHttpServer())
        .post(finalUrl)
        .set('Authorization', getAuthorizationHeader(initiator))
        .expect(expectedStatusCode)
        .expect({ statusCode: 403, message: 'Forbidden' });

      expect(
        await Promise.all([
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote1.userId }),
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote2.userId }),
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote3.userId }),
          chatVoteRepo.findOne({ chatVotingId, userId: chatVote4.userId }),
        ]),
      ).toEqual(expect.arrayContaining([expect.anything()]));
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
    chatVotingRepo = connection.getRepository(ChatVoting);
    chatVoteRepo = connection.getRepository(ChatVote);
    configService = app.get<ConfigService<Config>>(ConfigService);
    jwtService = app.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    const tableNames = [
      ChatVote.tableName,
      ChatVoting.tableName,
      User.tableName,
    ];

    await connection.query(`TRUNCATE ${tableNames.join(',')} CASCADE;`);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('/chat-votes (POST)', () => {
    describe('permissions', () => {
      it('should create ChatVoting by broadcaster', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });

      it('should create ChatVoting by editors', async () => {
        const [broadcaster, editor] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: editor,
          isEditor: true,
          addChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });

      it('should not create ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: viewer,
          addChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });
    });

    describe('dto validation', () => {
      it('should create ChatVoting with all required fields', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });

      it('should not create ChatVoting without all required fields', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.BAD_REQUEST, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {} as any,
        });
      });

      test('broadcasterId: wrong type', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.BAD_REQUEST, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: { broadcasterId: false } as any,
        });
      });

      test('broadcasterId: not existing user', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: { broadcasterId: '1' },
        });
      });

      test('restrictions: wrong type', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.BAD_REQUEST, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            restrictions: '',
          } as any,
        });
      });

      test('restrictions: missing fields', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.BAD_REQUEST, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            restrictions: {
              [TwitchUserType.Viewer]: false,
              [TwitchUserType.SubTier1]: false,
              [TwitchUserType.SubTier2]: false,
              [TwitchUserType.SubTier3]: false,
              [TwitchUserType.Mod]: false,
              [TwitchUserType.Vip]: false,
            } as any,
          },
        });
      });

      test('restrictions: valid', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            restrictions: {
              [TwitchUserType.Viewer]: true,
              [TwitchUserType.SubTier1]: true,
              [TwitchUserType.SubTier2]: true,
              [TwitchUserType.SubTier3]: true,
              [TwitchUserType.Mod]: true,
              [TwitchUserType.Vip]: true,
              subMonthsRequired: 0,
            },
          },
        });
      });

      test('listening: wrong type', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.BAD_REQUEST, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            listening: 1 as any,
          },
        });
      });

      test('listening: valid', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            listening: false,
          },
        });
      });
    });

    describe('logic', () => {
      it('should start listening chat if listening=true', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            listening: true,
          },
        });

        expect(twitchChatServiceMock.joinChannel).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.joinChannel).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it('should not start listening chat if listening=false', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          addChatVotingDto: {
            broadcasterId: broadcaster.id,
            listening: false,
          },
        });

        expect(twitchChatServiceMock.joinChannel).not.toHaveBeenCalled();
      });
    });
  });

  describe('/chat-votes/:chatVotingId (PUT)', () => {
    describe('permissions', () => {
      it('should update ChatVoting by broadcaster', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          updateChatVotingDto: { listening: true },
        });
      });

      it('should update ChatVoting by editors', async () => {
        const [broadcaster, editor] = await userRepo.save(users);

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: editor,
          isEditor: true,
          updateChatVotingDto: { listening: true },
        });
      });

      it('should not update ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await userRepo.save(users);

        await testUpdateChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: viewer,
          updateChatVotingDto: { listening: true },
        });
      });
    });

    describe('logic', () => {
      it('should start listening chat if listening switches to true', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          chatVotingParams: { listening: false },
          updateChatVotingDto: { listening: true },
        });

        expect(twitchChatServiceMock.joinChannel).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.joinChannel).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it('should stop listening chat if listening switches to false', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          chatVotingParams: { listening: true },
          updateChatVotingDto: { listening: false },
        });

        expect(twitchChatServiceMock.partChannel).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.partChannel).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it('should not do anything if listening flag is not sended', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          updateChatVotingDto: {},
        });

        expect(twitchChatServiceMock.joinChannel).not.toHaveBeenCalled();
        expect(twitchChatServiceMock.partChannel).not.toHaveBeenCalled();
      });
    });
  });

  describe('/chat-votes/:chatVotingId (DELETE)', () => {
    describe('permissions', () => {
      it('should delete ChatVoting by broadcaster', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
        });
      });

      it('should delete ChatVoting by editors', async () => {
        const [broadcaster, editor] = await userRepo.save(users);

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: editor,
          isEditor: true,
        });
      });

      it('should not delete ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await userRepo.save(users);

        await testDeleteChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: viewer,
        });
      });
    });

    describe('logic', () => {
      it('should stop listening chat', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
        });

        expect(twitchChatServiceMock.partChannel).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.partChannel).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it('should delete all assigned ChatVote records', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          onBeforeTest: async ({ chatVoting }) => {
            const chatVotingId = chatVoting.broadcasterId;

            const [chatVote1, chatVote2, chatVote3, chatVote4] =
              await chatVoteRepo.save(
                Array.from({ length: 4 }, (_, i) => ({
                  chatVotingId,
                  userId: `${i + 1}`,
                  userName: `user${i + 1}`,
                  tags: {},
                  content: `Test Vote ${i + 1}`,
                })) as ChatVote[],
              );

            return async () => {
              expect(
                await Promise.all([
                  chatVoteRepo.findOne({
                    chatVotingId,
                    userId: chatVote1.userId,
                  }),
                  chatVoteRepo.findOne({
                    chatVotingId,
                    userId: chatVote2.userId,
                  }),
                  chatVoteRepo.findOne({
                    chatVotingId,
                    userId: chatVote3.userId,
                  }),
                  chatVoteRepo.findOne({
                    chatVotingId,
                    userId: chatVote4.userId,
                  }),
                ]),
              ).toEqual(expect.arrayContaining([undefined]));
            };
          },
        });
      });
    });
  });

  describe('/chat-votes/:chatVotingId/clear (POST)', () => {
    describe('permissions', () => {
      it('should clear ChatVoting by broadcaster', async () => {
        const [broadcaster] = await userRepo.save(users);

        await testClearChatVoting(HttpStatus.OK, {
          broadcaster,
          initiator: broadcaster,
        });
      });

      it('should clear ChatVoting by editors', async () => {
        const [broadcaster, editor] = await userRepo.save(users);

        await testClearChatVoting(HttpStatus.OK, {
          broadcaster,
          initiator: editor,
          isEditor: true,
        });
      });

      it('should not clear ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await userRepo.save(users);

        await testClearChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster,
          initiator: viewer,
        });
      });
    });
  });

  describe('Chat Messages', () => {
    describe('!clearvotes chat command', () => {
      it.todo('should clear ChatVoting by broadcaster');

      it.todo('should clear ChatVoting by editors');

      it.todo('should not clear ChatVoting by other users');
    });

    describe('validation', () => {
      it.todo('should skip messages starting not with "%"');

      it.todo('should skip empty messages');
    });

    describe('restrictions', () => {
      it.todo('should vote by mods');

      it.todo('should not vote by mods');

      it.todo('should vote by vips');

      it.todo('should not vote by vips');

      it.todo('should vote by subTier1');

      it.todo('should not vote by subTier1');

      it.todo('should vote by subTier2');

      it.todo('should not vote by subTier2');

      it.todo('should vote by subTier3');

      it.todo('should not vote by subTier3');

      it.todo('should vote by sub with months required');

      it.todo('should not vote by sub without months required');

      it.todo('should vote by viewer');

      it.todo('should not vote by viewer');
    });
  });
});
