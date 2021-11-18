import { VotingOption } from '../../src/honey-votes/votes/entities/voting-option.entity';
import { Vote } from '../../src/honey-votes/votes/entities/vote.entity';
import {
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.constants';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.constants';
import { createTestCreateVote, createTestDeleteVote } from './utils/common';
import { getHoneyVotesTestContext } from './utils/getHoneyVotesTestContext';
import { POSTGRES_MAX_INTEGER } from '../constants';

describe('HoneyVotes - Votes - Votes (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  const testCreateVote = createTestCreateVote(ctx);
  const testDeleteVote = createTestDeleteVote(ctx);

  describe('/votes (POST)', () => {
    describe('permissions', () => {
      it('should not create Vote by broadcaster', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
        });
      });

      it('should not create Vote by editors', async () => {
        const [user, editor] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should create Vote by mods', async () => {
        const [user, moderator] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
          votingParams: {
            permissions: { [TwitchUserType.Mod]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by mods', async () => {
        const [user, moderator] = await ctx.createUsers();

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

      it('should create Vote by sub Tier1', async () => {
        const [user, subTier1] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.Tier1 },
          votingParams: {
            permissions: {
              [TwitchUserType.Sub]: {
                canVote: true,
                subTierRequiredToVote: SubTier.Tier1,
              },
            },
          },
        });
      });

      it('should not create Vote by sub Tier1', async () => {
        const [user, subTier1] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.Tier1 },
        });
      });

      it('should create Vote by subTier2', async () => {
        const [user, subTier2] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.Tier2 },
          votingParams: {
            permissions: {
              [TwitchUserType.Sub]: {
                canVote: true,
                subTierRequiredToVote: SubTier.Tier2,
              },
            },
          },
        });
      });

      it('should not create Vote by sub Tier2', async () => {
        const [user, subTier2] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.Tier2 },
        });
      });

      it('should create Vote by sub Tier3', async () => {
        const [user, subTier3] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.Tier3 },
          votingParams: {
            permissions: {
              [TwitchUserType.Sub]: {
                canVote: true,
                subTierRequiredToVote: SubTier.Tier3,
              },
            },
          },
        });
      });

      it('should not create Vote by sub Tier3', async () => {
        const [user, subTier3] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.Tier3 },
        });
      });

      it('should create Vote by follower', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
          votingParams: {
            permissions: { [TwitchUserType.Follower]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by follower', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
        });
      });

      it('should create Vote by follower with required minutes to follow', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 120 },
          votingParams: {
            permissions: {
              [TwitchUserType.Follower]: {
                canVote: true,
                minutesToFollowRequiredToVote: 60,
              },
            },
          },
        });
      });

      it('should not create Vote by follower without required minutes to follow', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 10 },
          votingParams: {
            permissions: {
              [TwitchUserType.Follower]: {
                canVote: true,
                minutesToFollowRequiredToVote: 60,
              },
            },
          },
        });
      });

      it('should create Vote by any user', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            permissions: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });

      it('should not create Vote by any user', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
        });
      });
    });

    describe('dto validation', () => {
      test('votingOptionId: not exists', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          createVoteDto: { votingOptionId: POSTGRES_MAX_INTEGER },
        });
      });

      test('votingOptionId: empty', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: user,
          createVoteDto: { votingOptionId: undefined },
        });
      });
    });

    describe('logic', () => {
      it('should not create Vote if canManageVotes is disabled', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: viewer,
          votingParams: {
            permissions: { [TwitchUserType.Viewer]: { canVote: true } },
            canManageVotes: false,
          },
        });
      });
    });
  });

  describe('/votes (DELETE)', () => {
    describe('permissions', () => {
      it('should delete Vote by author', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testDeleteVote(200, {
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer,
          initiator: viewer,
          votingParams: {
            permissions: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });

      it('should not delete Vote not by author', async () => {
        const [user, viewer1, viewer2] = await ctx.createUsers();

        await testDeleteVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer1,
          initiator: viewer2,
          votingParams: {
            permissions: { [TwitchUserType.Viewer]: { canVote: true } },
          },
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if Vote is not exists', async () => {
        const [user] = await ctx.createUsers();

        await testDeleteVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: user,
          initiator: user,
          votingParams: {
            permissions: { [TwitchUserType.Viewer]: { canVote: true } },
          },
          votingOptionId: POSTGRES_MAX_INTEGER,
        });
      });
    });

    describe('logic', () => {
      it('should not delete Vote if canManageVotes is disabled', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testDeleteVote(403, {
          broadcaster: user,
          votingOptionAuthor: user,
          voteAuthor: viewer,
          initiator: viewer,
          votingParams: {
            permissions: { [TwitchUserType.Viewer]: { canVote: true } },
            canManageVotes: false,
          },
        });
      });
    });
  });
});
