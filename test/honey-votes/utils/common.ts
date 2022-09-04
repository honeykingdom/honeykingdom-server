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
import { DeleteVoteDto } from '../../../src/honey-votes/votes/dto/delete-vote.dto';
import HoneyVotesContext from './honey-votes-context.class';
import MockRequests, { MockUserRoles } from './mock-requests.class';

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

export type OnBeforeTest<T> = (
  ctx: T,
) => Promise<void | OnAfterTest> | void | OnAfterTest;
type OnAfterTest = () => Promise<void> | void;

// Voting

export const createTestCreateVoting =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorRoles,
      createVotingDto,
    }: {
      broadcaster: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
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

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

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
      expect(dbVoting).toBeNull();
    }
  };

export const createTestUpdateVoting =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode: HttpStatus.CREATED | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorRoles,
      // updateVotingDto,
      url,
    }: {
      broadcaster: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
      // updateVotingDto: UpdateVotingDto;
      url?: string;
    },
  ) => {
    const voting = await ctx.votingRepo.save({
      broadcaster,
      title: 'Test Voting',
    } as Voting);

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

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

      expect(await ctx.votingRepo.findOneBy({ id: voting.id })).toEqual(
        expectedVoting,
      );
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

      expect(await ctx.votingRepo.findOneBy({ id: voting.id })).toEqual(
        expectedVoting,
      );
    }
  };

export const createTestDeleteVoting =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorRoles,
      url,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
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

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

    const onAfterTest = await onBeforeTest({ voting });

    const finalUrl = url || `${API_BASE}/voting/${voting.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(await ctx.votingRepo.findOneBy({ id: voting.id })).toBeNull();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(await ctx.votingRepo.findOneBy({ id: voting.id })).toEqual(
        expectedVoting,
      );
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

// VotingOption

export const createTestCreateVotingOption =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      initiator,
      initiatorRoles,
      votingParams = {},
      createVotingOptionDto = {},
      expectedVotingOptionParams = {},
      skipDbCheck = false,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
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
      authorData: expect.anything(),
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
      ...expectedVotingOptionParams,
    };

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

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
        ).toBeNull();
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
        ).toBeNull();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

export const createTestDeleteVotingOption =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      author,
      initiator,
      initiatorRoles,
      votingParams = {},
      url,
      skipDbCheck,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      author: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
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
      authorData: expect.anything(),
      votingId: voting.id,
      type: VotingOptionType.Custom,
      cardTitle: 'Test VotingOption',
    };

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

    const onAfterTest = await onBeforeTest({ voting, votingOption });

    const finalUrl = url || `${API_BASE}/voting-options/${votingOption.id}`;

    if (expectedStatusCode === HttpStatus.OK) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOneBy({ id: votingOption.id }),
        ).toBeNull();
      }
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(finalUrl)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      if (!skipDbCheck) {
        expect(
          await ctx.votingOptionRepo.findOneBy({ id: votingOption.id }),
        ).toEqual(expectedVotingOption);
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

// Vote

export const createTestCreateVote =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode:
      | HttpStatus.CREATED
      | HttpStatus.BAD_REQUEST
      | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      votingOptionAuthor,
      initiator,
      initiatorRoles,
      votingParams = {},
      createVoteDto,
      skipDbCheck,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      votingOptionAuthor: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
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

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

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
        ).toBeNull();
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
        ).toBeNull();
      }
    }

    // @ts-expect-error
    await onAfterTest?.();
  };

export const createTestDeleteVote =
  (ctx: HoneyVotesContext, mr: MockRequests) =>
  async (
    expectedStatusCode: HttpStatus.OK | HttpStatus.FORBIDDEN,
    {
      broadcaster,
      votingOptionAuthor,
      voteAuthor,
      initiator,
      initiatorRoles,
      votingParams = {},
      votingOptionId,
      onBeforeTest = () => {},
    }: {
      broadcaster: User;
      votingOptionAuthor: User;
      voteAuthor: User;
      initiator: User;
      initiatorRoles?: MockUserRoles;
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

    mr.mockTwitchUserRoles(broadcaster, initiator, initiatorRoles);

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
          where: {
            author: { id: vote.author.id },
            voting: { id: vote.voting.id },
          },
        }),
      ).toBeNull();
    }

    if (expectedStatusCode === HttpStatus.FORBIDDEN) {
      await request(ctx.app.getHttpServer())
        .delete(url)
        .send(body)
        .set(...ctx.getAuthorizationHeader(initiator))
        .expect(expectedStatusCode);

      expect(
        await ctx.voteRepo.findOne({
          where: {
            author: { id: vote.author.id },
            voting: { id: vote.voting.id },
          },
        }),
      ).toEqual(expectedVote);
    }

    // @ts-expect-error
    await onAfterTest?.();
  };
