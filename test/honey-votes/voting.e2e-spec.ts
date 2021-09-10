import request from 'supertest';
import {
  VOTING_TITLE_MAX_LENGTH,
  VOTING_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTIONS_LIMIT_MIN,
  VOTING_OPTIONS_LIMIT_MAX,
  Voting,
} from '../../src/honey-votes/votes/entities/Voting.entity';
import {
  API_BASE,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.interface';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.interface';
import { users } from './utils/users';
import {
  createTestCreateVoting,
  createTestDeleteVoting,
  createTestUpdateVoting,
  getHoneyVotesTestContext,
} from './utils/common';

const POSTGRES_MAX_INTEGER = 2147483647;

describe('HoneyVotes - Votes - Voting (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  const testCreateVoting = createTestCreateVoting(ctx);
  const testUpdateVoting = createTestUpdateVoting(ctx);
  const testDeleteVoting = createTestDeleteVoting(ctx);

  describe('/voting (GET)', () => {
    it.todo('should return voting list');

    it.todo('should empty array if channelId is not exists');
  });

  describe('/voting/:votingId (GET)', () => {
    it.todo('should return Voting by id');

    it.todo('should return 404 if channelId is not exists');

    it.todo('should return 404 if Voting is not exists');

    it.todo('should return 403 if Voting is not assigned to this channelId');
  });

  describe('/voting (POST)', () => {
    describe('permissions', () => {
      it('should create Voting by broadcaster', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should create Voting by editors', async () => {
        const [user, editor] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not create Voting by other users', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testCreateVoting(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('dto validation', () => {
      test('with required params', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id },
        });
      });

      test('without required params', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: undefined },
        });
      });

      test('with non whitelisted params', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            wrongField: 'test',
            anotherField: false,
          } as any,
        });
      });

      test('title: valid', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, title: 'Test Voting' },
        });
      });

      test('title: invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, title: false } as any,
        });
      });

      test('title: too long', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            title: Array(VOTING_TITLE_MAX_LENGTH + 2).join('0'),
          },
        });
      });

      test('description: valid', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            description: 'This is test voting',
          },
        });
      });

      test('description: invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, description: 123 } as any,
        });
      });

      test('description: too long', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            description: Array(VOTING_DESCRIPTION_MAX_LENGTH + 2).join('0'),
          },
        });
      });

      test('canManageVotes: valid', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, canManageVotes: false },
        });
      });

      test('canManageVotes: invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            canManageVotes: 'hello world',
          } as any,
        });
      });

      test('canManageVotingOptions: valid', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, canManageVotingOptions: false },
        });
      });

      test('canManageVotingOptions: invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            canManageVotingOptions: 1,
          } as any,
        });
      });

      test('userTypesParams: valid', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
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
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
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
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: [
              VotingOptionType.IgdbGame,
              VotingOptionType.KinopoiskMovie,
            ],
          },
        });
      });

      test('allowedVotingOptionTypes: invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: false,
          } as any,
        });
      });

      test('allowedVotingOptionTypes: empty array', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, allowedVotingOptionTypes: [] },
        });
      });

      test('allowedVotingOptionTypes: duplicated values', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: [
              VotingOptionType.IgdbGame,
              VotingOptionType.IgdbGame,
            ],
          },
        });
      });

      test('allowedVotingOptionTypes: items with invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: ['hello world', 1, false],
          } as any,
        });
      });

      test('votingOptionsLimit: valid', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, votingOptionsLimit: 50 },
        });
      });

      test('votingOptionsLimit: invalid type', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            votingOptionsLimit: 'wrong type',
          } as any,
        });
      });

      test('votingOptionsLimit: not integer', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: { channelId: user.id, votingOptionsLimit: 10.5 },
        });
      });

      test('votingOptionsLimit: too low value', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            votingOptionsLimit: VOTING_OPTIONS_LIMIT_MIN - 1,
          },
        });
      });

      test('votingOptionsLimit: too high value', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          addVotingDto: {
            channelId: user.id,
            votingOptionsLimit: VOTING_OPTIONS_LIMIT_MAX + 1,
          },
        });
      });
    });
  });

  describe('/voting/:votingId (PUT)', () => {
    describe('permissions', () => {
      it('should update Voting by broadcaster', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testUpdateVoting(200, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should update Voting by editors', async () => {
        const [user, editor] = await ctx.userRepo.save(users);

        await testUpdateVoting(200, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not update Voting by other users', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testUpdateVoting(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if Voting is not exists', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testUpdateVoting(403, {
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Voting is assigned to this channelId', async () => {
        const [user1, user2] = await ctx.userRepo.save(users);
        const voting = await ctx.votingRepo.save({
          broadcaster: user2,
        } as Voting);

        await testUpdateVoting(403, {
          broadcaster: user1,
          initiator: user1,
          url: `${API_BASE}/voting/${voting.id}`,
        });
      });
    });

    // TODO
    describe('dto validation', () => {});
  });

  describe('/voting/:votingId (DELETE)', () => {
    describe('permissions', () => {
      it('should delete Voting by broadcaster', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testDeleteVoting(200, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should delete Voting by editors', async () => {
        const [user, editor] = await ctx.userRepo.save(users);

        await testDeleteVoting(200, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not delete Voting by other users', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testDeleteVoting(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if Voting is not exists', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testDeleteVoting(403, {
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await ctx.userRepo.save(users);
        const voting = await ctx.votingRepo.save({
          broadcaster: user2,
        } as Voting);

        await testDeleteVoting(403, {
          broadcaster: user1,
          initiator: user1,
          url: `${API_BASE}/voting/${voting.id}`,
        });
      });
    });

    describe('logic', () => {
      it('should delete assigned VotingOptions and Votes', async () => {
        const [user, viewer1, viewer2, viewer3, viewer4] =
          await ctx.userRepo.save(users);

        await testDeleteVoting(200, {
          broadcaster: user,
          initiator: user,
          onBeforeTest: async ({ voting }) => {
            const [votingOption1, votingOption2] =
              await ctx.votingOptionRepo.save([
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

            const [vote1, vote2, vote3, vote4] = await ctx.voteRepo.save([
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
                await ctx.votingOptionRepo.findOne(votingOption1.id),
              ).toBeUndefined();
              expect(
                await ctx.votingOptionRepo.findOne(votingOption2.id),
              ).toBeUndefined();

              expect(await ctx.voteRepo.findOne(vote1.id)).toBeUndefined();
              expect(await ctx.voteRepo.findOne(vote2.id)).toBeUndefined();
              expect(await ctx.voteRepo.findOne(vote3.id)).toBeUndefined();
              expect(await ctx.voteRepo.findOne(vote4.id)).toBeUndefined();
            };
          },
        });
      });
    });
  });
});
