import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import NodeCache from 'node-cache';
import { Repository } from 'typeorm';
import { POSTGRES_CONNECTION } from '../../../app.constants';
import HoneyError from '../../honey-error.enum';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { DeleteVoteDto } from '../dto/delete-vote.dto';
import { Vote } from '../entities/vote.entity';
import { VotingOption } from '../entities/voting-option.entity';

@Injectable()
export class VotesService {
  voteLimits = new NodeCache({ stdTTL: 5 });

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(VotingOption, POSTGRES_CONNECTION)
    private readonly votingOptionRepo: Repository<VotingOption>,
    @InjectRepository(Vote, POSTGRES_CONNECTION)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  async createVote(
    userId: string,
    { votingOptionId }: CreateVoteDto,
  ): Promise<void> {
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

    const hasAccess = await this.canCreateVote(user, votingOption);

    if (!hasAccess) throw new ForbiddenException();

    const votingId = votingOption.votingId;

    await this.voteRepo.save({
      author: { id: userId },
      voting: { id: votingId },
      votingOption,
    });
  }

  async deleteVote(
    userId: string,
    { votingOptionId }: DeleteVoteDto,
  ): Promise<void> {
    const [user, vote] = await Promise.all([
      this.usersService.findOne(userId),
      this.voteRepo.findOne({
        where: {
          author: { id: userId },
          votingOption: { id: votingOptionId },
        },
        relations: ['author', 'voting', 'votingOption'],
      }),
    ]);

    const hasAccess = await this.canDeleteVote(user, vote);

    if (!hasAccess) throw new ForbiddenException();

    await this.voteRepo.remove(vote);
  }

  private async canCreateVote(user: User, votingOption: VotingOption) {
    if (!votingOption || !user) return false;
    if (!votingOption.voting.canManageVotes) {
      throw new ForbiddenException(HoneyError.VoteCreateDisabled);
    }

    const key = `${user.id}-${votingOption.voting.id}`;

    if (this.voteLimits.get(key)) {
      throw new ForbiddenException(HoneyError.VoteCreateTooQuickly);
    }

    const { mod, vip, sub, follower, viewer } = votingOption.voting.permissions;

    if (
      viewer.canVote ||
      (await this.usersService.checkUserTypes(
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
      ))
    ) {
      this.voteLimits.set(key, true);

      return true;
    }

    throw new ForbiddenException(HoneyError.VoteCreateNoPermission);
  }

  private async canDeleteVote(user: User, vote: Vote) {
    if (!vote || !user) return false;
    if (!vote.voting.canManageVotes) {
      throw new ForbiddenException(HoneyError.VoteDeleteDisabled);
    }

    if (vote.author.id !== user.id) {
      throw new ForbiddenException(HoneyError.VoteDeleteNotOwner);
    }

    const key = `${user.id}-${vote.voting.id}`;

    if (this.voteLimits.get(key)) {
      throw new ForbiddenException(HoneyError.VoteDeleteTooQuickly);
    }

    return true;
  }
}
