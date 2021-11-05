import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { POSTGRES_CONNECTION } from '../../../app.constants';
import { User } from '../../users/entities/User.entity';
import { UsersService } from '../../users/users.service';
import { CreateVotingDto } from '../dto/create-voting.dto';
import { UpdateVotingDto } from '../dto/update-voting.dto';
import { Voting } from '../entities/Voting.entity';

@Injectable()
export class VotingService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Voting, POSTGRES_CONNECTION)
    private readonly votingRepo: Repository<Voting>,
  ) {}

  async getVotingList(channelId: string): Promise<Voting[]> {
    return this.votingRepo.find({
      where: { broadcaster: { id: channelId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getVoting(votingId: number): Promise<Voting> {
    const voting = await this.votingRepo.findOne({
      where: { id: votingId },
    });

    if (!voting) throw new NotFoundException();

    return voting;
  }

  // TODO: add voting limit that users can create
  async addVoting(
    userId: string,
    { channelId, ...data }: CreateVotingDto,
  ): Promise<Voting> {
    const hasAccess = await this.canCreateVoting(userId, channelId);

    if (!hasAccess) throw new ForbiddenException();

    // TODO: auto generate title?

    const savedVoting = await this.votingRepo.save({
      ...data,
      broadcaster: { id: channelId },
    } as Voting);

    delete savedVoting.broadcaster;

    return savedVoting;
  }

  async updateVoting(
    userId: string,
    votingId: number,
    data: UpdateVotingDto,
  ): Promise<Voting> {
    const [user, voting] = await Promise.all([
      this.usersService.findOne(userId, { relations: ['credentials'] }),
      this.votingRepo.findOne(votingId, {
        relations: ['broadcaster', 'broadcaster.credentials'],
      }),
    ]);
    const hasAccess = await this.canUpdateOrDeleteVoting(user, voting);

    if (!hasAccess) throw new ForbiddenException();

    return this.votingRepo.save({ ...voting, ...data } as Voting);
  }

  async removeVoting(userId: string, votingId: number): Promise<void> {
    const [user, voting] = await Promise.all([
      this.usersService.findOne(userId, { relations: ['credentials'] }),
      this.votingRepo.findOne(votingId, {
        relations: ['broadcaster', 'broadcaster.credentials'],
      }),
    ]);
    const hasAccess = await this.canUpdateOrDeleteVoting(user, voting);

    if (!hasAccess) throw new ForbiddenException();

    await this.votingRepo.delete(votingId);
  }

  private async canCreateVoting(
    userId: string,
    channelId: string,
  ): Promise<boolean> {
    if (userId === channelId) {
      const user = await this.usersService.findOne(userId, {
        relations: ['credentials'],
      });

      return !!user;
    }

    const [user, channel] = await Promise.all([
      this.usersService.findOne(userId, { relations: ['credentials'] }),
      this.usersService.findOne(channelId, { relations: ['credentials'] }),
    ]);

    if (!user || !channel) return false;

    const isEditor = await this.usersService.isEditor(channel, user);

    return isEditor;
  }

  private async canUpdateOrDeleteVoting(
    user: User,
    voting: Voting,
  ): Promise<boolean> {
    if (!voting || !user) return false;

    const isOwner = voting.broadcaster.id === user.id;

    if (isOwner) return true;

    const isEditor = await this.usersService.isEditor(voting.broadcaster, user);

    return isEditor;
  }
}
