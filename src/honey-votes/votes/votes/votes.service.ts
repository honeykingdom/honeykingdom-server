import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { POSTGRES_CONNECTION } from '../../../app.constants';
import { User } from '../../users/entities/User.entity';
import { UsersService } from '../../users/users.service';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { DeleteVoteDto } from '../dto/delete-vote.dto';
import { Vote } from '../entities/Vote.entity';
import { Voting } from '../entities/Voting.entity';
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

  async addVote(
    userId: string,
    { votingOptionId }: CreateVoteDto,
  ): Promise<void> {
    const hasAccess = await this.canCreateVote(userId, votingOptionId);

    if (!hasAccess) throw new ForbiddenException();

    // https://docs.nestjs.com/techniques/database#transactions
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const votingOption = await queryRunner.manager.findOne(
        VotingOption,
        votingOptionId,
      );

      if (!votingOption) throw new BadRequestException();

      const votingId = votingOption.votingId;

      const oldVote = await queryRunner.manager.findOne(Vote, {
        where: { author: { id: userId }, voting: { id: votingId } },
        relations: ['votingOption'],
      });

      if (oldVote) {
        // don't create Vote twice for the same user and VotingOption
        if (oldVote.votingOptionId === votingOptionId) {
          throw new BadRequestException();
        }

        // remove old Vote and update old VotingOption fullVotesValue
        if (oldVote.votingOptionId !== votingOptionId) {
          const fullVotesValue =
            oldVote.votingOption.fullVotesValue - oldVote.value;
          const votingOption = { ...oldVote.votingOption, fullVotesValue };

          await Promise.all([
            queryRunner.manager.save(VotingOption, votingOption),
            queryRunner.manager.delete(Vote, oldVote.id),
          ]);
        }
      }

      const vote = queryRunner.manager.create(Vote, {
        author: { id: userId },
        voting: { id: votingId },
        votingOption,
      });

      await Promise.all([
        queryRunner.manager.save(Vote, vote),
        queryRunner.manager.save(VotingOption, {
          ...votingOption,
          fullVotesValue: votingOption.fullVotesValue + 1,
        }),
      ]);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async removeVote(
    userId: string,
    { votingOptionId }: DeleteVoteDto,
  ): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [user, vote] = await Promise.all([
        queryRunner.manager.findOne(User, userId),
        queryRunner.manager.findOne(Vote, {
          where: {
            author: { id: userId },
            votingOption: { id: votingOptionId },
          },
          relations: ['author', 'voting', 'votingOption'],
        }),
      ]);

      const hasAccess = await this.canDeleteVote(user, vote);

      if (!hasAccess) throw new ForbiddenException();

      vote.votingOption.fullVotesValue -= vote.value;

      await Promise.all([
        queryRunner.manager.delete(Vote, vote.id),
        queryRunner.manager.save(VotingOption, vote.votingOption),
      ]);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async canCreateVote(userId: string, votingOptionId: number) {
    const [user, votingOption] = await Promise.all([
      this.usersService.findOne(userId, { relations: ['credentials'] }),
      this.votingOptionRepo.findOne(votingOptionId, {
        relations: [
          'voting',
          'voting.broadcaster',
          'voting.broadcaster.credentials',
        ],
      }),
    ]);

    if (!votingOption || !user) return false;
    if (!votingOption.voting.canManageVotes) return false;

    const { mod, vip, sub, follower, viewer } = votingOption.voting.permissions;

    if (viewer.canVote) return true;

    if (
      await this.usersService.checkUserTypes(
        votingOption.voting.broadcaster,
        user,
        {
          mod: mod.canVote,
          vip: vip.canVote,
          sub: sub.canVote,
          follower: follower.canVote,
          minutesToFollowRequired: follower.minutesToFollowRequiredToVote,
          subTierRequired: sub.subTierRequiredToVote,
        },
      )
    ) {
      return true;
    }

    return false;
  }

  private async canDeleteVote(user: User, vote: Vote) {
    if (!vote || !user) return false;
    if (vote.author.id !== user.id) return false;
    if (!vote.voting.canManageVotes) return false;

    return true;
  }
}
