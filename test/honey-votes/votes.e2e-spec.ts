import { VotingOption } from '../../src/honey-votes/votes/entities/VotingOption.entity';
import { Vote } from '../../src/honey-votes/votes/entities/Vote.entity';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.interface';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.interface';
import { users } from './utils/users';
import {
  createTestCreateVote,
  createTestDeleteVote,
  getHoneyVotesTestContext,
} from './utils/common';

const POSTGRES_MAX_INTEGER = 2147483647;

describe('HoneyVotes - Votes - Votes (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  const testCreateVote = createTestCreateVote(ctx);
  const testDeleteVote = createTestDeleteVote(ctx);

  describe('/votes (POST)', () => {
    describe('permissions', () => {
      it('should not create Vote by broadcaster', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
        });
      });

      it('should not create Vote by editors', async () => {
        const [user, editor] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should create Vote by mods', async () => {
        const [user, moderator] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
        const [user, moderator] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
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
        const [user, subTier1] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
        const [user, subTier1] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.t1 },
        });
      });

      it('should create Vote by subTier2', async () => {
        const [user, subTier2] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
        const [user, subTier2] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.t2 },
        });
      });

      it('should create Vote by subTier3', async () => {
        const [user, subTier3] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
        const [user, subTier3] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.t3 },
        });
      });

      it('should create Vote by follower', async () => {
        const [user, follower] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
        const [user, follower] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
        });
      });

      it('should create Vote by follower with required minutes to follow', async () => {
        const [user, follower] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
        const [user, follower] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
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
        const [user, viewer] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by any user', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
        });
      });
    });

    describe('dto validation', () => {
      test('votingOptionId: not exists', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          addVoteDto: { votingOptionId: POSTGRES_MAX_INTEGER },
        });
      });

      test('votingOptionId: empty', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          addVoteDto: { votingOptionId: undefined },
        });
      });
    });

    describe('logic', () => {
      it('should not create Vote if canManageVotes is disabled', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testCreateVote(403, {
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
        const [user, viewer] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
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
                await ctx.votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 1 });
            },
        });
      });

      it('should update fullVotesValue for VotingOption if it is not the first vote', async () => {
        const [user, viewer1, viewer2, viewer3] = await ctx.userRepo.save(
          users,
        );

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ voting, votingOption }) => {
            await ctx.voteRepo.save([
              { user: viewer2, voting, votingOption },
              { user: viewer3, voting, votingOption },
            ]);
            await ctx.votingOptionRepo.save({
              ...votingOption,
              fullVotesValue: 2,
            } as VotingOption);

            return async () => {
              expect(
                await ctx.votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 3 });
            };
          },
        });
      });

      it('should not create Vote for one VotingOption for the same user twice', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testCreateVote(400, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          skipDbCheck: true,
          onBeforeTest: async ({ voting, votingOption }) => {
            await ctx.voteRepo.save({
              author: viewer,
              voting,
              votingOption,
            } as Vote);
            await ctx.votingOptionRepo.save({
              ...votingOption,
              fullVotesValue: 1,
            } as VotingOption);

            return async () => {
              expect(
                await ctx.voteRepo.count({ where: { author: viewer.id } }),
              ).toBe(1);
            };
          },
        });
      });

      it('should remove old Vote if user voted for the new VotingOption', async () => {
        const [user, viewer1, viewer2] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ voting }) => {
            const votingOption2 = await ctx.votingOptionRepo.save({
              author: viewer2,
              voting,
              type: VotingOptionType.Custom,
              cardTitle: 'Test VotingOption',
            } as VotingOption);
            const vote2 = await ctx.voteRepo.save({
              author: viewer1,
              voting,
              votingOption: votingOption2,
            } as Vote);

            return async () => {
              expect(await ctx.voteRepo.findOne(vote2.id)).toBeUndefined();
            };
          },
        });
      });

      it('should update fullVotesValue for old and new VotingOption if user voted for the new VotingOption', async () => {
        const [user, viewer1, viewer2] = await ctx.userRepo.save(users);

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer1,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          onBeforeTest: async ({ voting, votingOption }) => {
            const votingOption2 = await ctx.votingOptionRepo.save({
              author: viewer2,
              voting,
              type: VotingOptionType.Custom,
              cardTitle: 'Test VotingOption',
              fullVotesValue: 1,
            } as VotingOption);
            await ctx.voteRepo.save({
              author: viewer1,
              voting,
              votingOption: votingOption2,
            } as Vote);

            return async () => {
              expect(
                await ctx.votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 1 });
              expect(
                await ctx.votingOptionRepo.findOne(votingOption2.id),
              ).toMatchObject({ fullVotesValue: 0 });
            };
          },
        });
      });
    });
  });

  describe('/votes/:voteId (DELETE)', () => {
    describe('permissions', () => {
      it('should delete Vote by author', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testDeleteVote(200, {
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
        const [user, viewer1, viewer2] = await ctx.userRepo.save(users);

        await testDeleteVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer1,
          initiator: viewer2,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if Vote is not exists', async () => {
        const [user] = await ctx.userRepo.save(users);

        await testDeleteVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            userTypesParams: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          url: `${API_BASE}/votes/${POSTGRES_MAX_INTEGER}`,
        });
      });
    });

    describe('logic', () => {
      it('should not delete Vote if canManageVotes is disabled', async () => {
        const [user, viewer] = await ctx.userRepo.save(users);

        await testDeleteVote(403, {
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
        const [user, viewer] = await ctx.userRepo.save(users);

        await testDeleteVote(200, {
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
                await ctx.votingOptionRepo.findOne(votingOption.id),
              ).toMatchObject({ fullVotesValue: 0 });
            };
          },
        });
      });
    });
  });
});
