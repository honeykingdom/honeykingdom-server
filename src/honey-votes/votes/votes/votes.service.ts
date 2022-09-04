import {
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import HoneyError from '../../honey-error.enum';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { DeleteVoteDto } from '../dto/delete-vote.dto';
import { Vote } from '../entities/vote.entity';
import { VotingOption } from '../entities/voting-option.entity';

@Injectable()
export class VotesService {
  private static CACHE_TTL = 60;
  private static CACHE_KEY = {
    voteLimit: (userId: string, votingId: number) =>
      `vote-limit.${userId}.${votingId}`,
  };

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(VotingOption)
    private readonly votingOptionRepo: Repository<VotingOption>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async createVote(
    userId: string,
    { votingOptionId }: CreateVoteDto,
  ): Promise<void> {
    const [user, votingOption] = await Promise.all([
      this.usersService.findOne({
        where: { id: userId },
        relations: { credentials: true },
      }),
      this.votingOptionRepo.findOne({
        where: { id: votingOptionId },
        relations: { voting: { broadcaster: { credentials: true } } },
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
      this.usersService.findOneBy({ id: userId }),
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

    const key = VotesService.CACHE_KEY.voteLimit(
      user.id,
      votingOption.voting.id,
    );

    if (await this.cache.get<boolean>(key)) {
      throw new ForbiddenException(HoneyError.VoteCreateTooQuickly);
    }

    const { mod, vip, sub, follower, viewer } = votingOption.voting.permissions;

    if (
      viewer.canVote ||
      (await this.usersService.isHasPermissions(
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
      this.cache.set<boolean>(key, true, { ttl: VotesService.CACHE_TTL });

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

    const key = VotesService.CACHE_KEY.voteLimit(user.id, vote.voting.id);

    if (await this.cache.get(key)) {
      throw new ForbiddenException(HoneyError.VoteDeleteTooQuickly);
    }

    return true;
  }
}
