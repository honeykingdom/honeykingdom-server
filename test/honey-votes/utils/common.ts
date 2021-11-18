import { HttpStatus } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import request from 'supertest';
import R from 'ramda';
import { sub } from 'date-fns';
import {
  API_BASE,
  SubTier,
  TwitchUserType,
  VotingOptionType,
} from '../../../src/honey-votes/honey-votes.constants';
import { User } from '../../../src/honey-votes/users/entities/user.entity';
import { Vote } from '../../../src/honey-votes/votes/entities/vote.entity';
import { Voting } from '../../../src/honey-votes/votes/entities/voting.entity';
import { VotingOption } from '../../../src/honey-votes/votes/entities/voting-option.entity';
import { CreateVotingDto } from '../../../src/honey-votes/votes/dto/create-voting.dto';
import { VotingPermissions } from '../../../src/honey-votes/votes/dto/VotingPermissions';
import { UpdateVotingDto } from '../../../src/honey-votes/votes/dto/update-voting.dto';
import { CreateVotingOptionDto } from '../../../src/honey-votes/votes/dto/create-voting-option.dto';
import { CreateVoteDto } from '../../../src/honey-votes/votes/dto/create-vote.dto';
import {
  VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  VOTING_CAN_MANAGE_VOTES_DEFAULT,
  VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT,
  VOTING_OPTIONS_LIMIT_DEFAULT,
  VOTING_PERMISSIONS_DEFAULT,
  VOTING_SHOW_VALUES_DEFAULT,
} from '../../../src/honey-votes/votes/votes.constants';
import {
  mockCheckUserSubscription,
  mockGetChannelEditors,
  mockGetModerators,
  mockGetUserFollows,
} from './mock-requests';
import { HoneyVotesTestContext } from './getHoneyVotesTestContext';
import { DeleteVoteDto } from '../../../src/honey-votes/votes/dto/delete-vote.dto';

const defaultVotingParams: Partial<Voting> = {
  id: expect.any(Number),
  broadcasterId: expect.any(String),
  title: null,
  description: null,
  canManageVotes: VOTING_CAN_MANAGE_VOTES_DEFAULT,
  canManageVotingOptions: VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT,
  permissions: VOTING_PERMISSIONS_DEFAULT,
  showValues: VOTING_SHOW_VALUES_DEFAULT,
  allowedVotingOptionTypes: VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  votingOptionsLimit: VOTING_OPTIONS_LIMIT_DEFAULT,
  createdAt: expect.anything(),
  updatedAt: expect.anything(),
};

const defaultVotingOptionParams = {
  id: expect.any(Number),
  authorId: expect.any(String),
  votingId: expect.any(Number),
  type: expect.stringMatching(
    new RegExp(
      `^${[
        VotingOptionType.KinopoiskMovie,
        VotingOptionType.IgdbGame,
        VotingOptionType.Custom,
      ].join('|')}$`,
    ),
  ),
  cardId: null,
  cardTitle: expect.any(String),
  cardSubtitle: null,
  cardDescription: null,
  cardImageUrl: null,
  cardImageId: null,
  cardUrl: null,
  createdAt: expect.anything(),
  updatedAt: expect.anything(),
};

const defaultVoteParams = {
  authorId: expect.any(String),
  votingId: expect.any(Number),
  votingOptionId: expect.any(Number),
  value: 1,
  createdAt: expect.anything(),
  updatedAt: expect.anything(),
};

export const votingPermissionsForbidden: VotingPermissions = {
  [TwitchUserType.Mod]: { canVote: false, canAddOptions: false },
  [TwitchUserType.Vip]: { canVote: false, canAddOptions: false },
  [TwitchUserType.Sub]: {
    canVote: false,
    canAddOptions: false,
    subTierRequiredToVote: SubTier.Tier1,
    subTierRequiredToAddOptions: SubTier.Tier1,
  },
  [TwitchUserType.Follower]: {
    canVote: false,
    canAddOptions: false,
    minutesToFollowRequiredToVote: 0,
    minutesToFollowRequiredToAddOptions: 0,
  },
  [TwitchUserType.Viewer]: { canVote: false, canAddOptions: false },
};

type UserTypes = {
  isEditor?: boolean;
  isMod?: boolean;
  isVip?: boolean;
  isSub?: boolean;
  tier?: SubTier;
  isFollower?: boolean;
  followedMinutes?: number;
};

const mockUserTypes = (
  broadcaster: User,
  user: User,
  {
    isEditor,
    isMod,
    isVip,
    isSub,
    tier,
    isFollower,
    followedMinutes,
  }: UserTypes = {},
) => {
  // TODO: test is axios called with correct arguments

  mockGetChannelEditors(isEditor ? [user] : []);
  mockGetModerators(isMod ? [user] : []);
  mockCheckUserSubscription(
    ...((isSub ? [broadcaster, tier] : []) as [User?, SubTier?]),
  );
  mockGetUserFollows(
    ...((isFollower
      ? [broadcaster, user, sub(new Date(), { minutes: followedMinutes })]
      : []) as [User?, User?, Date?]),
  );
};

export type OnBeforeTest<T> = (
  ctx: T,
) => Promise<void | OnAfterTest> | void | OnAfterTest;
type OnAfterTest = () => Promise<void> | void;

// Voting

export const createTestCreateVoting =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      createVotingDto,
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      createVotingDto?: CreateVotingDto;
    },
  ) => {
    const expectedVoting = {
      ...defaultVotingParams,
      ...R.omit(['channelId'], createVotingDto),
      broadcasterId: broadcaster.id,
    };

    const body: CreateVotingDto = {
      channelId: broadcaster.id,
      ...createVotingDto,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    await request(ctx.app.getHttpServer())
      .post(`${API_BASE}/voting`)
      .set(...ctx.getAuthorizationHeader(initiator))
      .send(body)
      .expect(expectedStatusCode)
      .expect((response) => {
        if (expectedStatusCode === HttpStatus.CREATED) {
          expect(response.body).toEqual(expectedVoting);
        }
      });

    const dbVoting = await ctx.votingRepo.findOne({
      where: { broadcaster: { id: broadcaster.id } },
    });

    if (expectedStatusCode === HttpStatus.CREATED) {
      expect(dbVoting).toEqual(expectedVoting);
    }

    if (
      expectedStatusCode === HttpStatus.BAD_REQUEST ||
      expectedStatusCode === HttpStatus.FORBIDDEN
    ) {
      expect(dbVoting).toBeUndefined();
    }
  };

export const createTestUpdateVoting =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.CREATED | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      // updateVotingDto,
      url,
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      // updateVotingDto: UpdateVotingDto;
      url?: string;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      broadcaster,
      title: 'Test Voting',
    } as Voting);

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const finalUrl = url || `${API_BASE}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      const updateVotingDto: UpdateVotingDto = { title: 'New Title' };
      const expectedVoting = {
        ...defaultVotingParams,
        ...updateVotingDto,
        broadcasterId: broadcaster.id,
      };

      await request(ctx.app.getHttpServer())
        .put(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(updateVotingDto)
        .expect(expectedStatusCode)
        .expect((response) => expect(response.body).toEqual(expectedVoting));

      expect(await ctx.votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      const updateVotingDto: UpdateVotingDto = { title: 'New Title' };
      const expectedVoting = {
        ...defaultVotingParams,
        broadcasterId: broadcaster.id,
        title: 'Test Voting',
      };

      await request(ctx.app.getHttpServer())
        .put(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(updateVotingDto)
        .expect(expectedStatusCode);

      expect(await ctx.votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }
  };

export const createTestDeleteVoting =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      url,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      url?: string;
      onBeforeTest?: OnBeforeTest<{ voting: Voting }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      broadcaster,
      title: 'Test Voting',
    } as Voting);
    const expectedVoting = {
      ...defaultVotingParams,
      title: 'Test Voting',
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting });

    const finalUrl = url || `${API_BASE}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(await ctx.votingRepo.findOne(voting.id)).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(await ctx.votingRepo.findOne(voting.id)).toEqual(expectedVoting);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

// VotingOption

export const createTestCreateVotingOption =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorTypes,
      votingParams = {},
      createVotingOptionDto = {},
      expectedVotingOptionParams = {},
      skipDbCheck = false,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Omit<Voting, 'permissions'>> & {
        permissions?: DeepPartial<VotingPermissions>;
      };
      createVotingOptionDto?: Partial<CreateVotingOptionDto>;
      expectedVotingOptionParams?: Partial<VotingOption>;
      skipDbCheck?: boolean;
      onBeforeTest?: OnBeforeTest<{ voting: Voting }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      ...R.mergeDeepRight(
        { permissions: votingPermissionsForbidden },
        votingParams,
      ),
      broadcaster,
    } as Voting);
    const body: CreateVotingOptionDto = {
      type: VotingOptionType.Custom,
      [VotingOptionType.Custom]: { title: 'Test VotingOption' },
      votingId: voting.id,
      ...createVotingOptionDto,
    };
    const expectedVotingOption: Partial<VotingOption> = {
      ...defaultVotingOptionParams,
      authorId: initiator.id,
      authorLogin: expect.any(String),
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
      ...expectedVotingOptionParams,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting });

    const url = `${API_BASE}/voting-options`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode)
        .expect((response) =>
          expect(response.body).toEqual(expectedVotingOption),
        );

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toEqual(expectedVotingOption);
      }
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne({
            where: { voting: { id: voting.id } },
          }),
        ).toBeUndefined();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

export const createTestDeleteVotingOption =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      author,
      initiator,
      initiatorTypes,
      votingParams = {},
      url,
      skipDbCheck,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      author: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Voting>;
      url?: string;
      skipDbCheck?: boolean;
      onBeforeTest?: OnBeforeTest<{
        voting: Voting;
        votingOption: VotingOption;
      }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      broadcaster,
      permissions: votingPermissionsForbidden,
      ...votingParams,
    } as Voting);
    const votingOption = await ctx.votingOptionRepo.save({
      author,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    } as VotingOption);
    const expectedVotingOption: Partial<VotingOption> = {
      ...defaultVotingOptionParams,
      id: votingOption.id,
      authorId: author.id,
      authorLogin: expect.any(String),
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption });

    const finalUrl = url || `${API_BASE}/voting-options/${votingOption.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOne(votingOption.id),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(await ctx.votingOptionRepo.findOne(votingOption.id)).toEqual(
          expectedVotingOption,
        );
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

// Vote

export const createTestCreateVote =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      votingOptionAuthor,
      initiator,
      initiatorTypes,
      votingParams = {},
      createVoteDto,
      skipDbCheck,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      votingOptionAuthor: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Omit<Voting, 'permissions'>> & {
        permissions?: DeepPartial<VotingPermissions>;
      };
      createVoteDto?: CreateVoteDto;
      skipDbCheck?: boolean;
      onBeforeTest?: OnBeforeTest<{
        voting: Voting;
        votingOption: VotingOption;
      }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      ...R.mergeDeepRight(
        { permissions: votingPermissionsForbidden },
        votingParams,
      ),
      broadcaster,
    } as Voting);
    const votingOption = await ctx.votingOptionRepo.save({
      author: votingOptionAuthor,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    } as VotingOption);
    const body = {
      ...createVoteDto,
      votingOptionId: votingOption.id,
    };
    const expectedVote = {
      ...defaultVoteParams,
      authorId: initiator.id,
      votingId: voting.id,
      votingOptionId: votingOption.id,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption });

    const url = `${API_BASE}/votes`;

    if (expectedStatusCode === HttpStatus.CREATED) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode);

      expect(
        await ctx.voteRepo.findOne({ where: { author: { id: initiator.id } } }),
      ).toEqual(expectedVote);
    }

    if (expectedStatusCode === HttpStatus.BAD_REQUEST) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.voteRepo.findOne({
            where: { author: { id: initiator.id } },
          }),
        ).toBeUndefined();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .post(url)
        .set(...ctx.getAuthorizationHeader(initiator))
        .send(body)
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.voteRepo.findOne({
            where: { author: { id: initiator.id } },
          }),
        ).toBeUndefined();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

export const createTestDeleteVote =
  (ctx: HoneyVotesTestContext) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      votingOptionAuthor,
      voteAuthor,
      initiator,
      initiatorTypes,
      votingParams = {},
      votingOptionId,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      votingOptionAuthor: User;
      voteAuthor: User;
      initiator: User;
      initiatorTypes?: UserTypes;
      votingParams?: Partial<Omit<Voting, 'permissions'>> & {
        permissions?: DeepPartial<VotingPermissions>;
      };
      votingOptionId?: number;
      onBeforeTest?: OnBeforeTest<{
        voting: Voting;
        votingOption: VotingOption;
        vote: Vote;
      }>;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      ...R.mergeDeepRight(
        { permissions: votingPermissionsForbidden },
        votingParams,
      ),
      broadcaster,
    } as Voting);
    const votingOption = await ctx.votingOptionRepo.save({
      author: votingOptionAuthor,
      voting,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    } as VotingOption);
    const vote = await ctx.voteRepo.save({
      author: voteAuthor,
      voting,
      votingOption,
    } as Vote);
    const body: DeleteVoteDto = {
      votingOptionId: votingOptionId || votingOption.id,
    };
    const expectedVote = {
      ...defaultVoteParams,
      authorId: voteAuthor.id,
      votingId: voting.id,
      votingOptionId: votingOption.id,
    };

    mockUserTypes(broadcaster, initiator, initiatorTypes);

    const onAfterTest = await onBeforeTest({ voting, votingOption, vote });

    const url = `${API_BASE}/votes`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(url)
        .send(body)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await ctx.voteRepo.findOne({
          where: { author: vote.author, voting: vote.voting },
        }),
      ).toBeUndefined();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(url)
        .send(body)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await ctx.voteRepo.findOne({
          where: { author: vote.author, voting: vote.voting },
        }),
      ).toEqual(expectedVote);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };
