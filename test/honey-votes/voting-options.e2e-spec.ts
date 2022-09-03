import { Voting } from '../../src/honey-votes/votes/entities/voting.entity';
import { Vote } from '../../src/honey-votes/votes/entities/vote.entity';
import { VotingOption } from '../../src/honey-votes/votes/entities/voting-option.entity';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
} from '../../src/honey-votes/honey-votes.constants';
import { VotingOptionType } from '../../src/honey-votes/honey-votes.constants';
import {
  VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTION_CARD_TITLE_MAX_LENGTH,
} from '../../src/honey-votes/votes/votes.constants';
import { mockGetFilmData, mockIgdbGames } from './utils/mock-requests';
import { movie371 } from '../kinopoisk-api.mock';
import { game379 } from '../igdb-api.mock';
import {
  createTestCreateVotingOption,
  createTestDeleteVotingOption,
} from './utils/common';
import { getHoneyVotesTestContext } from './utils/getHoneyVotesTestContext';
import { POSTGRES_MAX_INTEGER } from '../constants';

describe('HoneyVotes - Votes - VotingOption (e2e)', () => {
  const ctx = getHoneyVotesTestContext();

  const testCreateVotingOption = createTestCreateVotingOption(ctx);
  const testDeleteVotingOption = createTestDeleteVotingOption(ctx);

  describe('/voting-options (POST)', () => {
    describe('permissions', () => {
      it('should always create VotingOption by broadcaster', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: user,
        });
      });

      it('should always create VotingOption by editors', async () => {
        const [user, editor] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should create VotingOption by mods', async () => {
        const [user, moderator] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
          votingParams: {
            permissions: {
              [TwitchUserType.Mod]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by mods', async () => {
        const [user, moderator] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: moderator,
          initiatorTypes: { isMod: true },
        });
      });

      // TODO: vips
      // it('should create VotingOption by vips', async () => {});
      // it('should not create VotingOption by vips', async () => {});

      it('should create VotingOption by sub Tier1', async () => {
        const [user, subTier1] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.Tier1 },
          votingParams: {
            permissions: {
              [TwitchUserType.Sub]: {
                canAddOptions: true,
                subTierRequiredToAddOptions: SubTier.Tier1,
              },
            },
          },
        });
      });

      it('should not create VotingOption by sub Tier1', async () => {
        const [user, subTier1] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: subTier1,
          initiatorTypes: { isSub: true, tier: SubTier.Tier1 },
        });
      });

      it('should create VotingOption by sub Tier2', async () => {
        const [user, subTier2] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.Tier2 },
          votingParams: {
            permissions: {
              [TwitchUserType.Sub]: {
                canAddOptions: true,
                subTierRequiredToAddOptions: SubTier.Tier2,
              },
            },
          },
        });
      });

      it('should not create VotingOption by sub Tier2', async () => {
        const [user, subTier2] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: subTier2,
          initiatorTypes: { isSub: true, tier: SubTier.Tier2 },
        });
      });

      it('should create VotingOption by sub Tier3', async () => {
        const [user, subTier3] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.Tier3 },
          votingParams: {
            permissions: {
              [TwitchUserType.Sub]: {
                canAddOptions: true,
                subTierRequiredToAddOptions: SubTier.Tier3,
              },
            },
          },
        });
      });

      it('should not create VotingOption by sub Tier3', async () => {
        const [user, subTier3] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: subTier3,
          initiatorTypes: { isSub: true, tier: SubTier.Tier3 },
        });
      });

      it('should create VotingOption by any follower', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
          votingParams: {
            permissions: {
              [TwitchUserType.Follower]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by any follower', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true },
        });
      });

      it('should create VotingOption by follower with required minutes to follow', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 120 },
          votingParams: {
            permissions: {
              [TwitchUserType.Follower]: {
                canAddOptions: true,
                minutesToFollowRequiredToAddOptions: 60,
              },
            },
          },
        });
      });

      it('should not create VotingOption by follower without required minutes to follow', async () => {
        const [user, follower] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: follower,
          initiatorTypes: { isFollower: true, followedMinutes: 10 },
          votingParams: {
            permissions: {
              [TwitchUserType.Follower]: {
                canAddOptions: true,
                minutesToFollowRequiredToAddOptions: 60,
              },
            },
          },
        });
      });

      it('should create VotingOption by any user', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: viewer,
          votingParams: {
            permissions: {
              [TwitchUserType.Viewer]: { canAddOptions: true },
            },
          },
        });
      });

      it('should not create VotingOption by any user', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: viewer,
        });
      });
    });

    describe('dto validation', () => {
      it('should return 403 if Voting is not exists', async () => {
        const [user] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: user,
          createVotingOptionDto: { votingId: POSTGRES_MAX_INTEGER },
        });
      });

      it('should return 403 if Voting is not assigned to this channelId', async () => {
        const [user1, user2] = await ctx.createUsers();
        const voting = await ctx.votingRepo.save({
          broadcaster: user2,
        } as Voting);

        await testCreateVotingOption(403, {
          broadcaster: user1,
          initiator: user1,
          createVotingOptionDto: { votingId: voting.id },
        });
      });
    });

    describe('KinopoiskMovie', () => {
      describe('dto validation', () => {
        it('with required fields', async () => {
          const [user] = await ctx.createUsers();
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption(201, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.KinopoiskMovie,
              [VotingOptionType.KinopoiskMovie]: { id: movieId },
            },
            expectedVotingOptionParams: {
              type: VotingOptionType.KinopoiskMovie,
              cardId: `${movieId}`,
              cardTitle: expect.any(String),
              cardDescription: expect.any(String),
              cardImageUrl: expect.any(String),
              cardUrl: expect.any(String),
            },
          });
        });

        it('without required fields', async () => {
          const [user] = await ctx.createUsers();
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: { type: VotingOptionType.KinopoiskMovie },
          });
        });

        it('id: invalid type', async () => {
          const [user] = await ctx.createUsers();
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.KinopoiskMovie,
              [VotingOptionType.KinopoiskMovie]: { id: false as any },
            },
          });
        });

        it('id: not integer', async () => {
          const [user] = await ctx.createUsers();
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.KinopoiskMovie,
              [VotingOptionType.KinopoiskMovie]: { id: 371.5 },
            },
          });
        });

        it('id: non existing', async () => {
          const [user] = await ctx.createUsers();
          const movieId = 1;

          mockGetFilmData(movieId, '', { statusCode: 404 });

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.KinopoiskMovie,
              [VotingOptionType.KinopoiskMovie]: { id: movieId },
            },
          });
        });
      });

      describe('logic', () => {
        it('should not create VotingOption if its already exists with same id', async () => {
          const [user] = await ctx.createUsers();
          const movieId = 371;

          mockGetFilmData(movieId, movie371);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.KinopoiskMovie,
              [VotingOptionType.KinopoiskMovie]: { id: movieId },
            },
            skipDbCheck: true,
            onBeforeTest: async ({ voting }) => {
              await ctx.votingOptionRepo.save({
                author: user,
                voting,
                type: VotingOptionType.KinopoiskMovie,
                cardId: `${movieId}`,
                cardTitle: '',
                cardSubtitle: '',
                cardDescription: '',
                cardImageUrl: '',
                cardUrl: '',
              } as VotingOption);
            },
          });
        });
      });
    });

    describe('IgdbGame', () => {
      describe('dto validation', () => {
        it('with required fields', async () => {
          const [user] = await ctx.createUsers();
          const gameSlug = 'metal-gear-solid-3-snake-eater';

          mockIgdbGames([game379]);

          await testCreateVotingOption(201, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.IgdbGame,
              [VotingOptionType.IgdbGame]: { slug: gameSlug },
            },
            expectedVotingOptionParams: {
              type: VotingOptionType.IgdbGame,
              cardId: gameSlug,
              cardTitle: expect.any(String),
              cardDescription: expect.any(String),
              cardImageId: expect.any(String),
              cardUrl: expect.any(String),
            },
          });
        });

        it('without required fields', async () => {
          const [user] = await ctx.createUsers();

          mockIgdbGames([game379]);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: { type: VotingOptionType.IgdbGame },
          });
        });

        it('id: invalid type', async () => {
          const [user] = await ctx.createUsers();

          mockIgdbGames([game379]);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.IgdbGame,
              [VotingOptionType.IgdbGame]: { slug: false as any },
            },
          });
        });

        it('id: empty', async () => {
          const [user] = await ctx.createUsers();

          mockIgdbGames([game379]);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.IgdbGame,
              [VotingOptionType.IgdbGame]: { slug: '' },
            },
          });
        });

        it('id: non existing', async () => {
          const [user] = await ctx.createUsers();
          const gameSlug = 'non-existing-game';

          mockIgdbGames([]);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.IgdbGame,
              [VotingOptionType.IgdbGame]: { slug: gameSlug },
            },
          });
        });
      });

      describe('logic', () => {
        it('should not create VotingOption if its already exists with same id', async () => {
          const [user] = await ctx.createUsers();
          const gameSlug = 'metal-gear-solid-3-snake-eater';

          mockIgdbGames([game379]);

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.IgdbGame,
              [VotingOptionType.IgdbGame]: { slug: gameSlug },
            },
            skipDbCheck: true,
            onBeforeTest: async ({ voting }) => {
              await ctx.votingOptionRepo.save({
                author: user,
                voting,
                type: VotingOptionType.IgdbGame,
                cardId: gameSlug,
                cardTitle: '',
                cardSubtitle: '',
                cardDescription: '',
                cardImageUrl: '',
                cardUrl: '',
              } as VotingOption);
            },
          });
        });
      });
    });

    describe('Custom', () => {
      describe('dto validation', () => {
        it('with required fields', async () => {
          const [user] = await ctx.createUsers();

          await testCreateVotingOption(201, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.Custom,
              [VotingOptionType.Custom]: {
                title: 'Test VotingOption',
              },
            },
            expectedVotingOptionParams: {
              type: VotingOptionType.Custom,
              cardTitle: 'Test VotingOption',
            },
          });
        });

        it.skip('without required fields', async () => {
          const [user] = await ctx.createUsers();

          // TODO: payload already pass in the testCreateVotingOption function
          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: { type: VotingOptionType.Custom },
          });
        });

        it('title: invalid type', async () => {
          const [user] = await ctx.createUsers();

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              payload: { type: VotingOptionType.Custom, title: 123 },
            } as any,
          });
        });

        it('title: too long', async () => {
          const [user] = await ctx.createUsers();

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.Custom,
              [VotingOptionType.Custom]: {
                title: Array(VOTING_OPTION_CARD_TITLE_MAX_LENGTH + 2).join('0'),
              },
            },
          });
        });

        it('description: invalid type', async () => {
          const [user] = await ctx.createUsers();

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.Custom,
              [VotingOptionType.Custom]: {
                title: 'Test VotingOption',
                description: false as any,
              },
            },
          });
        });

        it('description: too long', async () => {
          const [user] = await ctx.createUsers();

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.Custom,
              [VotingOptionType.Custom]: {
                title: 'Test VotingOption',
                description: Array(
                  VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH + 2,
                ).join('0'),
              },
            },
          });
        });
      });

      describe('logic', () => {
        it("should not create VotingOption if it's already exists with same title", async () => {
          const [user] = await ctx.createUsers();

          await testCreateVotingOption(400, {
            broadcaster: user,
            initiator: user,
            createVotingOptionDto: {
              type: VotingOptionType.Custom,
              [VotingOptionType.Custom]: { title: 'Test VotingOption' },
            },
            skipDbCheck: true,
            onBeforeTest: async ({ voting }) => {
              await ctx.votingOptionRepo.save({
                author: user,
                voting,
                type: VotingOptionType.Custom,
                cardId: null,
                cardTitle: 'Test VotingOption',
                cardSubtitle: null,
                cardDescription: null,
                cardImageUrl: null,
                cardUrl: null,
              } as VotingOption);
            },
          });
        });
      });
    });

    describe('logic', () => {
      it('should not create VotingOption if canManageVotingOptions is disabled', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: viewer,
          votingParams: {
            permissions: {
              [TwitchUserType.Viewer]: { canAddOptions: true },
            },
            canManageVotingOptions: false,
          },
        });
      });

      it('should not create VotingOption twice for users', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testCreateVotingOption(403, {
          broadcaster: user,
          initiator: viewer,
          votingParams: {
            permissions: {
              [TwitchUserType.Viewer]: { canAddOptions: true },
            },
          },
          skipDbCheck: true,
          onBeforeTest: async ({ voting }) => {
            await ctx.votingOptionRepo.save({
              author: viewer,
              voting,
              type: VotingOptionType.Custom,
              cardTitle: 'My VotingOption',
            });
          },
        });
      });

      it('should create VotingOption if user already created VotingOption for another Voting', async () => {
        const [user, viewer] = await ctx.createUsers();

        const voting = await ctx.votingRepo.save({
          broadcaster: user,
          title: 'My Voting',
        });
        await ctx.votingOptionRepo.save({
          author: viewer,
          voting,
          type: VotingOptionType.Custom,
          cardTitle: 'My VotingOption',
        });

        await testCreateVotingOption(201, {
          broadcaster: user,
          initiator: viewer,
          votingParams: {
            permissions: {
              [TwitchUserType.Viewer]: { canAddOptions: true },
            },
          },
          skipDbCheck: true,
        });
      });

      it.todo(
        'should not create VotingOption by broadcaster if limit is reached',
      );

      it.todo('should not create VotingOption by editors if limit is reached');

      it.todo('should not create VotingOption by users if limit is reached');
    });
  });

  describe('/voting-options/:votingOptionId (DELETE)', () => {
    describe('permissions', () => {
      it('should delete any VotingOption by broadcaster', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testDeleteVotingOption(200, {
          broadcaster: user,
          author: viewer,
          initiator: user,
        });
      });

      it('should delete any VotingOption by broadcaster if canManageVotingOptions is disabled', async () => {
        const [user, viewer] = await ctx.createUsers();

        await testDeleteVotingOption(200, {
          broadcaster: user,
          author: viewer,
          initiator: user,
          votingParams: { canManageVotingOptions: false },
        });
      });

      it('should delete any VotingOption by editors', async () => {
        const [user, viewer, editor] = await ctx.createUsers();

        await testDeleteVotingOption(200, {
          broadcaster: user,
          author: viewer,
          initiator: editor,
          initiatorTypes: { isEditor: true },
        });
      });

      it('should delete any VotingOption by editors if canManageVotingOptions is disabled', async () => {
        const [user, viewer, editor] = await ctx.createUsers();

        await testDeleteVotingOption(200, {
          broadcaster: user,
          author: viewer,
          initiator: editor,
          initiatorTypes: { isEditor: true },
          votingParams: { canManageVotingOptions: false },
        });
      });

      it('should not delete not own VotingOption', async () => {
        const [user, viewer1, viewer2] = await ctx.createUsers();

        await testDeleteVotingOption(403, {
          broadcaster: user,
          author: viewer1,
          initiator: viewer2,
        });
      });
    });

    describe('request validation', () => {
      it('should return 403 if VotingOption is not exists', async () => {
        const [user] = await ctx.createUsers();

        await testDeleteVotingOption(403, {
          broadcaster: user,
          author: user,
          initiator: user,
          url: `${API_BASE}/voting-options/${POSTGRES_MAX_INTEGER}`,
        });
      });
    });

    // logic
    it('should not delete own VotingOption if canManageVotingOptions is disabled', async () => {
      const [user, viewer] = await ctx.createUsers();

      await testDeleteVotingOption(403, {
        broadcaster: user,
        author: viewer,
        initiator: viewer,
        votingParams: { canManageVotingOptions: false },
      });
    });

    it('should delete own VotingOption if it has no votes', async () => {
      const [user, viewer] = await ctx.createUsers();

      await testDeleteVotingOption(200, {
        broadcaster: user,
        author: viewer,
        initiator: viewer,
      });
    });

    it('should not delete own VotingOption if it has votes', async () => {
      const [user, viewer1, viewer2] = await ctx.createUsers();

      await testDeleteVotingOption(403, {
        broadcaster: user,
        author: viewer1,
        initiator: viewer1,
        onBeforeTest: async ({ voting, votingOption }) => {
          await ctx.voteRepo.save({
            author: viewer2,
            voting,
            votingOption,
            value: 1,
          } as Vote);
        },
      });
    });

    it('should delete assigned Votes when deleting VotingOption', async () => {
      const [user, viewer] = await ctx.createUsers();

      await testDeleteVotingOption(200, {
        broadcaster: user,
        author: viewer,
        initiator: user,
        onBeforeTest: async ({ voting, votingOption }) => {
          const vote = await ctx.voteRepo.save({
            author: viewer,
            voting,
            votingOption,
            value: 1,
          } as Vote);

          return async () => {
            expect(
              await ctx.voteRepo.findOneBy({
                author: { id: vote.author.id },
                voting: { id: vote.voting.id },
              }),
            ).toBeUndefined();
          };
        },
      });
    });
  });
});
