import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { POSTGRES_CONNECTION } from '../../../app.constants';
import { UsersService } from '../../users/users.service';
import { AddVoteDto } from '../dto/addVoteDto';
import { Vote } from '../entities/Vote.entity';
import { VotingOption } from '../entities/VotingOption.entity';

@Injectable()
export class VotesService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(VotingOption, POSTGRES_CONNECTION)
    private readonly votingOptionRepo: Repository<VotingOption>,
    @InjectRepository(Vote, POSTGRES_CONNECTION)
    private readonly voteRepo: Repository<Vote>,
    @InjectConnection(POSTGRES_CONNECTION)
    private readonly connection: Connection,
  ) {}

  async addVote(userId: string, { votingOptionId }: AddVoteDto) {
    const hasAccess = await this.canCreateVote(userId, votingOptionId);

    if (!hasAccess) throw new ForbiddenException();

    // https://docs.nestjs.com/techniques/database#transactions
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldVote = await queryRunner.manager.findOne(Vote, {
        where: { user: { id: userId }, voting: { id: votingId } },
        relations: ['votingOption'],
      });

      // don't create Vote twice for the same user and VotingOption
      if (oldVote && oldVote.votingOptionId === votingOptionId) {
        throw new BadRequestException();
      }

      // remove old Vote and update old VotingOption fullVotesValue
      if (oldVote && oldVote.votingOptionId !== votingOptionId) {
        const fullVotesValue =
          oldVote.votingOption.fullVotesValue - oldVote.value;
        const votingOption = { ...oldVote.votingOption, fullVotesValue };

        await Promise.all([
          queryRunner.manager.save(VotingOption, votingOption),
          queryRunner.manager.delete(Vote, oldVote.id),
        ]);
      }

      const votingOption = await queryRunner.manager.findOne(
        VotingOption,
        votingOptionId,
      );

      const vote = queryRunner.manager.create(Vote, {
        user: { id: userId },
        voting: { id: votingId },
        votingOption: { id: votingOptionId },
      });

      await Promise.all([
        queryRunner.manager.save(Vote, vote),
        queryRunner.manager.save(VotingOption, {
          ...votingOption,
          fullVotesValue: votingOption.fullVotesValue + 1,
        }),
      ]);

      await queryRunner.commitTransaction();

      return { success: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async removeVote(userId: string, voteId: number) {
    const hasAccess = await this.canDeleteVote(userId, voteId);

    if (!hasAccess) throw new ForbiddenException();

    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const vote = await queryRunner.manager.findOne(Vote, {
        where: { id: voteId },
        relations: ['votingOption'],
      });

      vote.votingOption.fullVotesValue -= vote.value;

      await Promise.all([
        queryRunner.manager.delete(Vote, voteId),
        queryRunner.manager.save(VotingOption, vote.votingOption),
      ]);

      await queryRunner.commitTransaction();

      return { success: true };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async canCreateVote(userId: string, votingOptionId: number) {
    const [user, votingOption] = await Promise.all([
      this.usersService.findOne(userId),
      this.votingOptionRepo.findOne(votingOptionId, {
        relations: ['voting', 'voting.user'],
      }),
    ]);

    if (!votingOption || !user) return false;
    if (!votingOption.voting.canManageVotes) return false;

    const params = votingOption.voting.userTypesParams;

    if (params.viewer.canVote) return true;

    if (
      await this.usersService.checkUserTypes(votingOption.voting.user, user, {
        mod: params.mod.canVote,
        vip: params.vip.canVote,
        subTier1: params.subTier1.canVote,
        subTier2: params.subTier2.canVote,
        subTier3: params.subTier3.canVote,
        follower: params.follower.canVote,
        minutesToFollowRequired: params.follower.minutesToFollowRequiredToVote,
      })
    ) {
      return true;
    }

    return false;
  }

  private async canDeleteVote(userId: string, voteId: number) {
    const [user, vote] = await Promise.all([
      this.usersService.findOne(userId),
      this.voteRepo.findOne(voteId, { relations: ['user', 'voting'] }),
    ]);

    if (!vote || !user) return false;
    if (vote.user.id !== user.id) return false;
    if (!vote.voting.canManageVotes) return false;

    return true;
  }
}
