import { VotingOption } from '../../src/honey-votes/votes/entities/voting-option.entity';
import { Vote } from '../../src/honey-votes/votes/entities/vote.entity';
import {
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.constants';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.constants';
import { createTestCreateVote, createTestDeleteVote } from './utils/common';
import { POSTGRES_MAX_INTEGER } from '../constants';
import HoneyVotesContext from './utils/honey-votes-context.class';
import MockRequests from './utils/mock-requests.class';

describe('HoneyVotes - Votes - Votes (e2e)', () => {
  const ctx = new HoneyVotesContext();
  const mr = new MockRequests();

  beforeAll(() => Promise.all([ctx.create(), mr.listen()]));
  afterEach(() => Promise.all([ctx.clearTables(), mr.resetHandlers()]));
  afterAll(() => Promise.all([ctx.destroy(), mr.close()]));

  const testCreateVote = createTestCreateVote(ctx, mr);
  const testDeleteVote = createTestDeleteVote(ctx, mr);

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
          initiatorRoles: { editor: true },
        });
      });

      it('should create Vote by mods', async () => {
        const [user, moderator] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: moderator,
          initiatorRoles: { mod: true },
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
          initiatorRoles: { mod: true },
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
          initiatorRoles: { sub: true, subTier: SubTier.Tier1 },
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
          initiatorRoles: { sub: true, subTier: SubTier.Tier1 },
        });
      });

      it('should create Vote by subTier2', async () => {
        const [user, subTier2] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier2,
          initiatorRoles: { sub: true, subTier: SubTier.Tier2 },
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
          initiatorRoles: { sub: true, subTier: SubTier.Tier2 },
        });
      });

      it('should create Vote by sub Tier3', async () => {
        const [user, subTier3] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: subTier3,
          initiatorRoles: { sub: true, subTier: SubTier.Tier3 },
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
          initiatorRoles: { sub: true, subTier: SubTier.Tier3 },
        });
      });

      it('should create Vote by follower', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorRoles: { follower: true },
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
          initiatorRoles: { follower: true },
        });
      });

      it('should create Vote by follower with required minutes to follow', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVote(201, {
          broadcaster: user,
          votingOptionAuthor: user,
          initiator: follower,
          initiatorRoles: { follower: true, minutesFollowed: 120 },
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
          initiatorRoles: { follower: true, minutesFollowed: 10 },
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
