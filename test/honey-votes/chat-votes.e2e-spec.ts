import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { mockGetChannelEditors } from './utils/mock-requests';
import { OnBeforeTest } from './utils/common';
import { User } from '../../src/honey-votes/users/entities/user.entity';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.constants';
import { ChatVote } from '../../src/honey-votes/chat-votes/entities/chat-vote.entity';
import { ChatVoting } from '../../src/honey-votes/chat-votes/entities/chat-voting.entity';
import {
  CreateChatVotingDto,
  ChatVotingPermissions,
} from '../../src/honey-votes/chat-votes/dto/create-chat-voting.dto';
import { UpdateChatVotingDto } from '../../src/honey-votes/chat-votes/dto/update-chat-voting.dto';
import {
  CHAT_VOTING_COMMANDS_DEFAULT,
  CHAT_VOTING_COMMAND_MAX_LENGTH,
  CHAT_VOTING_PERMISSIONS_DEFAULT,
} from '../../src/honey-votes/chat-votes/chat-votes.constants';
import HoneyVotesContext, {
  twitchChatServiceMock,
} from './utils/honey-votes-context.class';

describe('HoneyVotes - ChatVotes (e2e)', () => {
  const ctx = new HoneyVotesContext();

  beforeAll(() => ctx.create());
  afterEach(() => ctx.clearTables());
  afterAll(() => ctx.destroy());

  const chatVotingPermissionsForbidden: ChatVotingPermissions = {
    [TwitchUserType.Viewer]: false,
    [TwitchUserType.Sub]: false,
    [TwitchUserType.Mod]: false,
    [TwitchUserType.Vip]: false,
    subMonthsRequired: 0,
    subTierRequired: SubTier.Tier1,
  };

  const defaultChatVotingParams: Partial<ChatVoting> = {
    permissions: CHAT_VOTING_PERMISSIONS_DEFAULT,
    listening: false,
    commands: CHAT_VOTING_COMMANDS_DEFAULT,
  };

  const testCreateChatVoting = async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      isEditor = false,
      createChatVotingDto,
    }: {
      broadcaster: User;
      initiator: User;
      isEditor?: boolean;
      createChatVotingDto?: CreateChatVotingDto;
    },
  ) => {
    const expectedChatVoting = {
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      ...defaultChatVotingParams,
      ...createChatVotingDto,
    };

    mockGetChannelEditors(isEditor ? [initiator] : []);

    await request(ctx.app.getHttpServer())
      .post(`${API_BASE}/chat-votes`)
      .set(...ctx.getAuthorizationHeader(initiator))
      .send(createChatVotingDto)
      .expect(expectedStatusCode)
      .expect((response) => {
        if (expectedStatusCode === HttpStatus.CREATED) {
          expect(response.body).toEqual(expectedChatVoting);
        }
      });

    const chatVoting = await ctx.chatVotingRepo.findOneBy({
      broadcasterId: broadcaster.id,
    });

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
    const chatVoting = await ctx.chatVotingRepo.save({
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

      await request(ctx.app.getHttpServer())
        .put(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(updateChatVotingDto)
        .expect(expectedStatusCode)
        .expect((response) =>
          expect(response.body).toEqual(expectedChatVoting),
        );

      expect(
        await ctx.chatVotingRepo.findOneBy({
          broadcasterId: chatVoting.broadcasterId,
        }),
      ).toEqual(expectedChatVoting);
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      const expectedChatVoting = {
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        ...defaultChatVotingParams,
        broadcasterId: broadcaster.id,
      };

      await request(ctx.app.getHttpServer())
        .put(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(updateChatVotingDto)
        .expect(expectedStatusCode);

      expect(
        await ctx.chatVotingRepo.findOneBy({
          broadcasterId: chatVoting.broadcasterId,
        }),
      ).toEqual(expectedChatVoting);
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
    const chatVoting = await ctx.chatVotingRepo.save({
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
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await ctx.chatVotingRepo.findOneBy({
          broadcasterId: chatVoting.broadcasterId,
        }),
      ).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await ctx.chatVotingRepo.findOneBy({
          broadcasterId: chatVoting.broadcasterId,
        }),
      ).toEqual(expectedVoting);
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
    const chatVoting = await ctx.chatVotingRepo.save({
      broadcaster,
    } as ChatVoting);
    const chatVotingId = chatVoting.broadcasterId;

    const [chatVote1, chatVote2, chatVote3, chatVote4] =
      await ctx.chatVoteRepo.save(
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
      await request(ctx.app.getHttpServer())
        .post(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await Promise.all([
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote1.userId,
          }),
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote2.userId,
          }),
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote3.userId,
          }),
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote4.userId,
          }),
        ]),
      ).toEqual(expect.arrayContaining([undefined]));
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .post(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await Promise.all([
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote1.userId,
          }),
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote2.userId,
          }),
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote3.userId,
          }),
          ctx.chatVoteRepo.findOneBy({
            chatVotingId,
            userId: chatVote4.userId,
          }),
        ]),
      ).toEqual(expect.arrayContaining([expect.anything()]));
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/chat-votes (POST)', () => {
    describe('permissions', () => {
      it('should create ChatVoting by broadcaster', async () => {
        const [broadcaster] = await ctx.createUsers();

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          createChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });

      it('should create ChatVoting by editors', async () => {
        const [broadcaster, editor] = await ctx.createUsers();

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: editor,
          isEditor: true,
          createChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });

      it('should not create ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await ctx.createUsers();

        await testCreateChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: viewer,
          createChatVotingDto: { broadcasterId: broadcaster.id },
        });
      });
    });

    describe('dto validation', () => {
      const testValidation = async (
        expectedStatusCode: Parameters<typeof testCreateChatVoting>[0],
        createChatVotingDto: Partial<
          Parameters<typeof testCreateChatVoting>[1]['createChatVotingDto']
        >,
      ) => {
        const [broadcaster] = await ctx.createUsers();

        await testCreateChatVoting(expectedStatusCode, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          createChatVotingDto: {
            broadcasterId: broadcaster.id,
            ...createChatVotingDto,
          },
        });
      };

      it('should create ChatVoting with all required fields', async () => {
        await testValidation(HttpStatus.CREATED, {});
      });

      it('should not create ChatVoting without all required fields', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          broadcasterId: undefined as any,
        });
      });

      test('broadcasterId: wrong type', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          broadcasterId: false as any,
        });
      });

      test('broadcasterId: not existing user', async () => {
        await testValidation(HttpStatus.FORBIDDEN, { broadcasterId: '1' });
      });

      test('permissions: wrong type', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          permissions: '' as any,
        });
      });

      test('permissions: empty object', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          permissions: {} as any,
        });
      });

      test('permissions: missing fields', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          permissions: {
            [TwitchUserType.Viewer]: false,
            [TwitchUserType.Sub]: false,
            [TwitchUserType.Mod]: false,
            [TwitchUserType.Vip]: false,
          } as any,
        });
      });

      test('permissions: valid', async () => {
        await testValidation(HttpStatus.CREATED, {
          permissions: {
            [TwitchUserType.Viewer]: true,
            [TwitchUserType.Sub]: true,
            [TwitchUserType.Mod]: true,
            [TwitchUserType.Vip]: true,
            subMonthsRequired: 0,
            subTierRequired: SubTier.Tier1,
          },
        });
      });

      test('listening: wrong type', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          listening: 1 as any,
        });
      });

      test('listening: valid', async () => {
        await testValidation(HttpStatus.CREATED, {
          listening: false,
        });
      });

      test('commands: wrong type', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          commands: false as any,
        });
      });

      test('commands: missing fields', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          commands: { vote: '%' } as any,
        });
      });

      test('commands: empty string', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          commands: { vote: '', clearVotes: '!clear' },
        });
      });

      test('commands: spaces', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          commands: { vote: ' ', clearVotes: ' !clear' },
        });
      });

      test('commands: the same value for commands', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          commands: { vote: '!vote', clearVotes: '!vote' },
        });
      });

      test('commands: too long', async () => {
        await testValidation(HttpStatus.BAD_REQUEST, {
          commands: {
            vote: Array(CHAT_VOTING_COMMAND_MAX_LENGTH + 2).join('0'),
            clearVotes: Array(CHAT_VOTING_COMMAND_MAX_LENGTH + 2).join('1'),
          },
        });
      });

      test('commands: valid', async () => {
        await testValidation(HttpStatus.CREATED, {
          commands: { vote: '!vote', clearVotes: '!clear' },
        });
      });
    });

    describe('logic', () => {
      it('should start listening chat if listening=true', async () => {
        const [broadcaster] = await ctx.createUsers();

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          createChatVotingDto: {
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
        const [broadcaster] = await ctx.createUsers();

        await testCreateChatVoting(HttpStatus.CREATED, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          createChatVotingDto: {
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
        const [broadcaster] = await ctx.createUsers();

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          updateChatVotingDto: { listening: true },
        });
      });

      it('should update ChatVoting by editors', async () => {
        const [broadcaster, editor] = await ctx.createUsers();

        await testUpdateChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: editor,
          isEditor: true,
          updateChatVotingDto: { listening: true },
        });
      });

      it('should not update ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await ctx.createUsers();

        await testUpdateChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: viewer,
          updateChatVotingDto: { listening: true },
        });
      });
    });

    describe('logic', () => {
      it('should start listening chat if listening switches to true', async () => {
        const [broadcaster] = await ctx.createUsers();

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
        const [broadcaster] = await ctx.createUsers();

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
        const [broadcaster] = await ctx.createUsers();

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
        const [broadcaster] = await ctx.createUsers();

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
        });
      });

      it('should delete ChatVoting by editors', async () => {
        const [broadcaster, editor] = await ctx.createUsers();

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: editor,
          isEditor: true,
        });
      });

      it('should not delete ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await ctx.createUsers();

        await testDeleteChatVoting(HttpStatus.FORBIDDEN, {
          broadcaster: broadcaster,
          initiator: viewer,
        });
      });
    });

    describe('logic', () => {
      it('should stop listening chat', async () => {
        const [broadcaster] = await ctx.createUsers();

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
        const [broadcaster] = await ctx.createUsers();

        await testDeleteChatVoting(HttpStatus.OK, {
          broadcaster: broadcaster,
          initiator: broadcaster,
          onBeforeTest: async ({ chatVoting }) => {
            const chatVotingId = chatVoting.broadcasterId;

            const [chatVote1, chatVote2, chatVote3, chatVote4] =
              await ctx.chatVoteRepo.save(
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
                  ctx.chatVoteRepo.findOneBy({
                    chatVotingId,
                    userId: chatVote1.userId,
                  }),
                  ctx.chatVoteRepo.findOneBy({
                    chatVotingId,
                    userId: chatVote2.userId,
                  }),
                  ctx.chatVoteRepo.findOneBy({
                    chatVotingId,
                    userId: chatVote3.userId,
                  }),
                  ctx.chatVoteRepo.findOneBy({
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
        const [broadcaster] = await ctx.createUsers();

        await testClearChatVoting(HttpStatus.OK, {
          broadcaster,
          initiator: broadcaster,
        });
      });

      it('should clear ChatVoting by editors', async () => {
        const [broadcaster, editor] = await ctx.createUsers();

        await testClearChatVoting(HttpStatus.OK, {
          broadcaster,
          initiator: editor,
          isEditor: true,
        });
      });

      it('should not clear ChatVoting by other users', async () => {
        const [broadcaster, viewer] = await ctx.createUsers();

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

    describe('permissions', () => {
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
