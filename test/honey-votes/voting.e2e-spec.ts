import { Voting } from '../../src/honey-votes/votes/entities/voting.entity';
import { VotingOption } from '../../src/honey-votes/votes/entities/voting-option.entity';
import { Vote } from '../../src/honey-votes/votes/entities/vote.entity';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.constants';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.constants';
import {
  VOTING_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTIONS_LIMIT_MAX,
  VOTING_OPTIONS_LIMIT_MIN,
  VOTING_TITLE_MAX_LENGTH,
} from '../../src/honey-votes/votes/votes.constants';
import {
  createTestCreateVoting,
  createTestDeleteVoting,
  createTestUpdateVoting,
} from './utils/common';
import { getHoneyVotesTestContext } from './utils/getHoneyVotesTestContext';
import { POSTGRES_MAX_INTEGER } from '../constants';

describe('HoneyVotes - Votes - Voting (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  const testCreateVoting = createTestCreateVoting(ctx);
  const testUpdateVoting = createTestUpdateVoting(ctx);
  const testDeleteVoting = createTestDeleteVoting(ctx);

  describe('/voting (POST)', () => {
    describe('permissions', () => {
      it('should create Voting by broadcaster', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should create Voting by editors', async () => {
        const [user, editor] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not create Voting by other users', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVoting(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('dto validation', () => {
      test('with required params', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id },
        });
      });

      test('without required params', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: undefined },
        });
      });

      test('with non whitelisted params', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            wrongField: 'test',
            anotherField: false,
          } as any,
        });
      });

      test('title: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, title: 'Test Voting' },
        });
      });

      test('title: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, title: false } as any,
        });
      });

      test('title: too long', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            title: Array(VOTING_TITLE_MAX_LENGTH + 2).join('0'),
          },
        });
      });

      test('description: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            description: 'This is test voting',
          },
        });
      });

      test('description: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, description: 123 } as any,
        });
      });

      test('description: too long', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            description: Array(VOTING_DESCRIPTION_MAX_LENGTH + 2).join('0'),
          },
        });
      });

      test('canManageVotes: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, canManageVotes: false },
        });
      });

      test('canManageVotes: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            canManageVotes: 'hello world',
          } as any,
        });
      });

      test('canManageVotingOptions: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            canManageVotingOptions: false,
          },
        });
      });

      test('canManageVotingOptions: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            canManageVotingOptions: 1,
          } as any,
        });
      });

      test('permissions: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            permissions: {
              [TwitchUserType.Mod]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Vip]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Sub]: {
                canVote: true,
                canAddOptions: true,
                subTierRequiredToVote: SubTier.Tier1,
                subTierRequiredToAddOptions: SubTier.Tier1,
              },
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

      // TODO:
      test.skip('permissions: empty', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            permissions: {} as any,
          },
        });
      });

      test('permissions: invalid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            permissions: {
              [TwitchUserType.Mod]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Vip]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Sub]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Follower]: { canVote: true, canAddOptions: true },
              [TwitchUserType.Viewer]: { canVote: true },
            } as any,
          },
        });
      });

      test('showValues: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, showValues: false },
        });
      });

      test('showValues: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            showValues: 1,
          } as any,
        });
      });

      test('allowedVotingOptionTypes: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: [
              VotingOptionType.IgdbGame,
              VotingOptionType.KinopoiskMovie,
            ],
          },
        });
      });

      test('allowedVotingOptionTypes: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: false,
          } as any,
        });
      });

      test('allowedVotingOptionTypes: empty array', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, allowedVotingOptionTypes: [] },
        });
      });

      test('allowedVotingOptionTypes: duplicated values', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: [
              VotingOptionType.IgdbGame,
              VotingOptionType.IgdbGame,
            ],
          },
        });
      });

      test('allowedVotingOptionTypes: items with invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            allowedVotingOptionTypes: ['hello world', 1, false],
          } as any,
        });
      });

      test('votingOptionsLimit: valid', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(201, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, votingOptionsLimit: 50 },
        });
      });

      test('votingOptionsLimit: invalid type', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            votingOptionsLimit: 'wrong type',
          } as any,
        });
      });

      test('votingOptionsLimit: not integer', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: { channelId: user.id, votingOptionsLimit: 10.5 },
        });
      });

      test('votingOptionsLimit: too low value', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
            channelId: user.id,
            votingOptionsLimit: VOTING_OPTIONS_LIMIT_MIN - 1,
          },
        });
      });

      test('votingOptionsLimit: too high value', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVoting(400, {
          broadcaster: user,
          initiator: user,
          createVotingDto: {
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
        const [user] = await ctx.createUsers();

        await testUpdateVoting(200, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should update Voting by editors', async () => {
        const [user, editor] = await ctx.createUsers();

        await testUpdateVoting(200, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not update Voting by other users', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testUpdateVoting(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if Voting is not exists', async () => {
        const [user] = await ctx.createUsers();

        await testUpdateVoting(403, {
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Voting is assigned to this channelId', async () => {
        const [user1, user2] = await ctx.createUsers();
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
        const [user] = await ctx.createUsers();

        await testDeleteVoting(200, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should delete Voting by editors', async () => {
        const [user, editor] = await ctx.createUsers();

        await testDeleteVoting(200, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should not delete Voting by other users', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testDeleteVoting(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if Voting is not exists', async () => {
        const [user] = await ctx.createUsers();

        await testDeleteVoting(403, {
          broadcaster: user,
          initiator: user,
          url: `${API_BASE}/voting/${POSTGRES_MAX_INTEGER}`,
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await ctx.createUsers();
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
          await ctx.createUsers();

        await testDeleteVoting(200, {
          broadcaster: user,
          initiator: user,
          onBeforeTest: async ({ voting }) => {
            const [votingOption1, votingOption2] =
              await ctx.votingOptionRepo.save([
                {
                  author: viewer1,
                  voting,
                  type: VotingOptionType.Custom,
                  cardTitle: 'Test VotingOption 1',
                } as VotingOption,
                {
                  author: viewer2,
                  voting,
                  type: VotingOptionType.Custom,
                  cardTitle: 'Test VotingOption 2',
                } as VotingOption,
              ]);

            const [vote1, vote2, vote3] = await ctx.voteRepo.save([
              {
                author: viewer2,
                voting,
                votingOption: votingOption1,
                value: 1,
              } as Vote,
              {
                author: viewer3,
                voting,
                votingOption: votingOption1,
                value: 1,
              } as Vote,
              {
                author: viewer4,
                voting,
                votingOption: votingOption2,
                value: 1,
              } as Vote,
            ]);

            return async () => {
              expect(
                await ctx.votingOptionRepo.findOne(votingOption1.id),
              ).toBeUndefined();
              expect(
                await ctx.votingOptionRepo.findOne(votingOption2.id),
              ).toBeUndefined();

              expect(
                await ctx.voteRepo.findOne({
                  where: { author: vote1.author, voting: vote1.voting },
                }),
              ).toBeUndefined();
              expect(
                await ctx.voteRepo.findOne({
                  where: { author: vote2.author, voting: vote2.voting },
                }),
              ).toBeUndefined();
              expect(
                await ctx.voteRepo.findOne({
                  where: { author: vote3.author, voting: vote3.voting },
                }),
              ).toBeUndefined();
            };
          },
        });
      });
    });
  });
});
