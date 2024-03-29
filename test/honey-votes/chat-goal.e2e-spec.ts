import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { User } from '../../src/honey-votes/users/entities/user.entity';
import { ChatGoal } from '../../src/honey-votes/chat-goal/entities/chat-goal.entity';
import { CreateChatGoalDto } from '../../src/honey-votes/chat-goal/dto/create-chat-goal.dto';
import {
  API_BASE,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.constants';
import {
  CHAT_GOAL_DEFAULT,
  CHAT_GOAL_PERMISSIONS_DEFAULT,
  CHAT_GOAL_TITLE_MAX_LENGTH,
  CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
} from '../../src/honey-votes/chat-goal/chat-goal.constants';
import HoneyVotesContext, {
  twitchChatServiceMock,
} from './utils/honey-votes-context.class';
import MockRequests from './utils/mock-requests.class';

describe.skip('HoneyVotes - ChatGoal (e2e)', () => {
  const ctx = new HoneyVotesContext();
  const mr = new MockRequests();

  beforeAll(() => Promise.all([ctx.create(), mr.listen()]));
  afterEach(() => Promise.all([ctx.clearTables(), mr.resetHandlers()]));
  afterAll(() => Promise.all([ctx.destroy(), mr.close()]));

  type Role =
    | TwitchUserType.Broadcaster
    | TwitchUserType.Editor
    | TwitchUserType.Viewer;

  const testCreateChatGoal = async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN = HttpStatus.CREATED,
    dto: Partial<CreateChatGoalDto> = {},
    role: Role = TwitchUserType.Broadcaster,
  ) => {
    const [broadcaster, editor, viewer] = await ctx.createUsers();

    const expectedResponse: Partial<ChatGoal> = {
      broadcasterId: broadcaster.id,
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      ...CHAT_GOAL_DEFAULT,
      ...dto,
      status: expect.any(Number),
      // TODO:
      endTimerTimestamp: expect.any(String),
    };

    const body: CreateChatGoalDto = {
      broadcasterId: broadcaster.id,
      ...dto,
    };

    let initiator: User;

    if (role === TwitchUserType.Broadcaster) initiator = broadcaster;
    if (role === TwitchUserType.Editor) initiator = editor;
    if (role === TwitchUserType.Viewer) initiator = viewer;

    mr.mockTwitchGetChannelEditors({ status: 200, response: [editor] });

    await request(ctx.app.getHttpServer())
      .post(`${API_BASE}/chat-goal`)
      .set(...ctx.getAuthorizationHeader(initiator))
      .send(body)
      .expect(expectedStatusCode)
      .expect((response) => {
        if (expectedStatusCode === HttpStatus.CREATED) {
          expect(response.body).toEqual(expectedResponse);
        }
      });

    return { broadcaster, initiator };
  };

  const testUpdateChatGoal = async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    goalId: string,
    dto: Partial<CreateChatGoalDto> = {},
    role: Role = TwitchUserType.Broadcaster,
  ) => {
    const [broadcaster, editor, viewer] = await ctx.createUsers();

    const chatGoal = await ctx.chatGoalRepo.findOneBy({
      broadcasterId: goalId,
    });

    const expectedResponse: ChatGoal = {
      ...chatGoal,
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      ...dto,
      status: expect.any(Number),
      // TODO:
      endTimerTimestamp: expect.any(String),
    };

    let initiator: User;

    if (role === TwitchUserType.Broadcaster) initiator = broadcaster;
    if (role === TwitchUserType.Editor) initiator = editor;
    if (role === TwitchUserType.Viewer) initiator = viewer;

    mr.mockTwitchGetChannelEditors({ status: 200, response: [editor] });

    await request(ctx.app.getHttpServer())
      .put(`${API_BASE}/chat-goal/${goalId}`)
      .set(...ctx.getAuthorizationHeader(initiator))
      .send(dto)
      .expect(expectedStatusCode)
      .expect((response) => {
        if (expectedStatusCode === HttpStatus.OK) {
          expect(response.body).toEqual(expectedResponse);
        }
      });

    return { broadcaster, initiator, chatGoal };
  };

  const testDeleteChatVoting = async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    goalId: string,
    role: Role = TwitchUserType.Broadcaster,
  ) => {
    const [broadcaster, editor, viewer] = await ctx.createUsers();

    const chatGoal = await ctx.chatGoalRepo.findOneBy({
      broadcasterId: goalId,
    });

    let initiator: User;

    if (role === TwitchUserType.Broadcaster) initiator = broadcaster;
    if (role === TwitchUserType.Editor) initiator = editor;
    if (role === TwitchUserType.Viewer) initiator = viewer;

    mr.mockTwitchGetChannelEditors({ status: 200, response: [editor] });

    await request(ctx.app.getHttpServer())
      .delete(`${API_BASE}/chat-goal/${goalId}`)
      .set(...ctx.getAuthorizationHeader(initiator))
      .expect(expectedStatusCode);

    return { broadcaster, initiator, chatGoal };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/chat-goal (POST)', () => {
    describe('permissions', () => {
      it('should create by broadcaster', async () => {
        await testCreateChatGoal(HttpStatus.CREATED);
      });

      it('should create by editors', async () => {
        await testCreateChatGoal(
          HttpStatus.CREATED,
          null,
          TwitchUserType.Editor,
        );
      });

      it("shouldn't create by other users", async () => {
        await testCreateChatGoal(
          HttpStatus.FORBIDDEN,
          null,
          TwitchUserType.Viewer,
        );
      });
    });

    describe('db', () => {
      it('should create record in the db if success', async () => {
        const { broadcaster } = await testCreateChatGoal(HttpStatus.CREATED);

        expect(
          await ctx.chatGoalRepo.findOneBy({ broadcasterId: broadcaster.id }),
        ).toBeDefined();
      });

      it("shouldn't create record in the db if failure", async () => {
        const { broadcaster } = await testCreateChatGoal(
          HttpStatus.FORBIDDEN,
          null,
          TwitchUserType.Viewer,
        );

        expect(
          await ctx.chatGoalRepo.findOneBy({ broadcasterId: broadcaster.id }),
        ).toBeNull();
      });
    });

    describe('dto validation', () => {
      test('with all required fields', async () => {
        await testCreateChatGoal(HttpStatus.CREATED);
      });

      test('without all required fields', async () => {
        await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
          broadcasterId: undefined as any,
        });
      });

      test('with redundant fields', async () => {
        await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
          notExistingField: 'test',
        } as any);
      });

      describe('broadcasterId', () => {
        test('wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            broadcasterId: false as any,
          });
        });

        test('not existing user', async () => {
          await testCreateChatGoal(HttpStatus.FORBIDDEN, {
            broadcasterId: '1',
          });
        });
      });

      describe('permissions', () => {
        test('wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            permissions: '' as any,
          });
        });

        // TODO:
        test.skip('empty object', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            permissions: {} as any,
          });
        });

        // TODO:
        test.skip('missing fields', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            permissions: {
              [TwitchUserType.Mod]: {
                canUpvote: true,
                canDownvote: true,
                votesAmount: 1,
              },
            } as any,
          });
        });

        test('redundant fields', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            permissions: {
              ...CHAT_GOAL_PERMISSIONS_DEFAULT,
              notExistingField: 'test',
            } as any,
          });
        });

        test('canUpvote - invalid type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            permissions: {
              ...CHAT_GOAL_PERMISSIONS_DEFAULT,
              [TwitchUserType.Mod]: {
                canUpvote: 'no',
                canDownvote: true,
                votesAmount: 1,
              } as any,
            },
          });
        });

        test('votesAmount - negative value', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            permissions: {
              ...CHAT_GOAL_PERMISSIONS_DEFAULT,
              [TwitchUserType.Mod]: {
                canUpvote: true,
                canDownvote: true,
                votesAmount: -5,
              },
            },
          });
        });

        test('valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, {
            permissions: CHAT_GOAL_PERMISSIONS_DEFAULT,
          });
        });
      });

      describe('listening', () => {
        test('wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            listening: 1 as any,
          });
        });

        test('valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, { listening: false });
        });
      });

      describe('title', () => {
        test('wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            title: 1 as any,
          });
        });

        test('too long', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            title: Array(CHAT_GOAL_TITLE_MAX_LENGTH + 2).join('0'),
          });
        });

        test('valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, { title: 'Test Title' });
        });
      });

      describe('upvoteCommand', () => {
        test('wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            upvoteCommand: 1 as any,
          });
        });

        test('too long', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            upvoteCommand: Array(CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH + 2).join(
              '0',
            ),
          });
        });

        test('valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, {
            upvoteCommand: 'good',
          });
        });
      });

      describe('downvoteCommand', () => {
        test('downvoteCommand: wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            downvoteCommand: 1 as any,
          });
        });

        test('downvoteCommand: too long', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            downvoteCommand: Array(CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH + 2).join(
              '0',
            ),
          });
        });

        test('downvoteCommand: valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, {
            downvoteCommand: 'bad',
          });
        });
      });

      describe('timerDuration', () => {
        test('timerDuration: wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            timerDuration: false as any,
          });
        });

        test('timerDuration: not integer', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            timerDuration: 1.5,
          });
        });

        test('timerDuration: negative value', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            timerDuration: -5,
          });
        });

        test('timerDuration: valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, { timerDuration: 5000 });
        });
      });

      describe('maxVotesValue', () => {
        test('maxVotesValue: wrong type', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            maxVotesValue: false as any,
          });
        });

        test('maxVotesValue: not integer', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            maxVotesValue: 1.5,
          });
        });

        test('maxVotesValue: negative value', async () => {
          await testCreateChatGoal(HttpStatus.BAD_REQUEST, {
            maxVotesValue: -5,
          });
        });

        test('maxVotesValue: valid', async () => {
          await testCreateChatGoal(HttpStatus.CREATED, { maxVotesValue: 200 });
        });
      });
    });

    describe('logic', () => {
      it("shouldn't create twice for the same user", async () => {});

      it.skip('should start listening to chat if listening=true', async () => {
        const { broadcaster } = await testCreateChatGoal(HttpStatus.CREATED, {
          listening: true,
        });

        expect(twitchChatServiceMock.join).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.join).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it.skip('should not start listening to chat if listening=false', async () => {
        await testCreateChatGoal(HttpStatus.CREATED, { listening: false });

        expect(twitchChatServiceMock.join).not.toHaveBeenCalled();
      });
    });
  });

  describe('/chat-goal/:goalId (PUT)', () => {
    describe('permissions', () => {
      it('should update by broadcaster', async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testUpdateChatGoal(HttpStatus.OK, broadcaster.id, {
          title: 'Test Title',
        });
      });

      it('should update by editors', async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testUpdateChatGoal(
          HttpStatus.OK,
          broadcaster.id,
          { title: 'Test Title' },
          TwitchUserType.Editor,
        );
      });

      it('should not update by other users', async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testUpdateChatGoal(
          HttpStatus.FORBIDDEN,
          broadcaster.id,
          { title: 'Test Title' },
          TwitchUserType.Viewer,
        );
      });
    });

    describe('db', () => {
      it.todo('should update record in the db if success');

      it.todo("shouldn't update record in the db if failure");
    });

    describe('params validation', () => {
      test('not existing id', async () => {
        await testUpdateChatGoal(HttpStatus.FORBIDDEN, '1', { title: 'Test' });
      });
    });

    describe('logic', () => {
      it.skip('should start listening to chat if listening switches to true', async () => {
        const { broadcaster } = await testCreateChatGoal(HttpStatus.CREATED, {
          listening: false,
        });
        await testUpdateChatGoal(HttpStatus.OK, broadcaster.id, {
          listening: true,
        });

        expect(twitchChatServiceMock.join).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.join).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it.skip('should stop listening to chat if listening switches to false', async () => {
        const { broadcaster } = await testCreateChatGoal(HttpStatus.CREATED, {
          listening: true,
        });
        await testUpdateChatGoal(HttpStatus.OK, broadcaster.id, {
          listening: false,
        });

        expect(twitchChatServiceMock.part).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.part).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });

      it("shouldn't do anything if listening flag is not sended", async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testUpdateChatGoal(HttpStatus.OK, broadcaster.id);

        expect(twitchChatServiceMock.join).not.toHaveBeenCalled();
        expect(twitchChatServiceMock.part).not.toHaveBeenCalled();
      });
    });
  });

  describe('/chat-votes/:goalId (DELETE)', () => {
    describe('permissions', () => {
      it('should delete by broadcaster', async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testDeleteChatVoting(HttpStatus.OK, broadcaster.id);
      });

      it('should delete by editors', async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testDeleteChatVoting(
          HttpStatus.OK,
          broadcaster.id,
          TwitchUserType.Editor,
        );
      });

      it("shouldn't delete by other users", async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testDeleteChatVoting(
          HttpStatus.FORBIDDEN,
          broadcaster.id,
          TwitchUserType.Viewer,
        );
      });
    });

    describe('db', () => {
      it.todo('should delete record in the db if success');

      it.todo("shouldn't delete record in the db if failure");

      it.todo('should delete assigned records');
    });

    describe('params validation', () => {
      test('not existing id', async () => {
        await testDeleteChatVoting(HttpStatus.FORBIDDEN, '1');
      });
    });

    describe('logic', () => {
      it.skip('should stop listening to chat', async () => {
        const { broadcaster } = await testCreateChatGoal();
        await testDeleteChatVoting(HttpStatus.OK, broadcaster.id);

        expect(twitchChatServiceMock.part).toHaveBeenCalledTimes(1);
        expect(twitchChatServiceMock.part).toHaveBeenCalledWith(
          broadcaster.login,
          expect.any(String),
        );
      });
    });
  });
});
