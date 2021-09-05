import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { getYear } from 'date-fns';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { KinopoiskApiService } from '../../kinopoisk-api/kinopoisk-api.service';
import { IgdbApiService } from '../../igdb-api/igdb-api.service';
import { Voting } from './entities/Voting.entity';
import { VotingOption, VotingOptionCard } from './entities/VotingOption.entity';
import { Vote } from './entities/Vote.entity';
import { User } from '../users/entities/User.entity';
import { AddVotingDto } from './dto/addVotingDto';
import { UpdateVotingDto } from './dto/updateVotingDto';
import { UsersService } from '../users/users.service';
import { VotingOptionType } from '../honey-votes.interface';
import { AddVotingOptionDto } from './dto/addVotingOptionDto';
import { GetFilmData } from '../../kinopoisk-api/kinopoisk-api.interface';

@Injectable()
export class VotesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly kinopoiskApiService: KinopoiskApiService,
    private readonly igdbApiService: IgdbApiService,
    @InjectRepository(User, POSTGRES_CONNECTION)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Voting, POSTGRES_CONNECTION)
    private readonly votingRepo: Repository<Voting>,
    @InjectRepository(VotingOption, POSTGRES_CONNECTION)
    private readonly votingOptionRepo: Repository<VotingOption>,
    @InjectRepository(Vote, POSTGRES_CONNECTION)
    private readonly voteRepo: Repository<Vote>,
    @InjectConnection(POSTGRES_CONNECTION)
    private readonly connection: Connection,
  ) {}

  async getChannelIdByName(channelName: string) {
    const channel = await this.userRepo.findOne({
      where: { login: channelName },
    });

    if (!channel) throw new NotFoundException();

    return { channelId: channel.id };
  }

  async getVotingList(channelId: string) {
    return this.votingRepo.find({
      where: { user: { id: channelId } },
      order: { createdAt: 'DESC' },
    });
  }

  // Voting

  async getVoting(userId: string | null, channelId: string, votingId: number) {
    const voting = await this.votingRepo.findOne({
      where: { id: votingId, user: { id: channelId } },
    });

    if (!voting) throw new NotFoundException();

    return voting;
  }

  async addVoting(userId: string, channelId: string, data: AddVotingDto) {
    const hasAccess = await this.canCreateVoting(userId, channelId);

    if (!hasAccess) throw new ForbiddenException();

    // TODO: auto generate title?

    // const user = await this.usersService.findOne(channelId);

    const voting = this.votingRepo.create({ ...data, user: { id: channelId } });

    const { user: _, ...savedVoting } = await this.votingRepo.save(voting);

    return savedVoting;
  }

  async updateVoting(
    userId: string,
    channelId: string,
    votingId: number,
    data: UpdateVotingDto,
  ) {
    const hasAccess = await this.canUpdateOrDeleteVoting(
      userId,
      channelId,
      votingId,
    );

    if (!hasAccess) throw new ForbiddenException();

    const voting = await this.votingRepo.findOne(votingId);

    return this.votingRepo.save({ ...voting, ...data });
  }

  async removeVoting(userId: string, channelId: string, votingId: number) {
    const hasAccess = await this.canUpdateOrDeleteVoting(
      userId,
      channelId,
      votingId,
    );

    if (!hasAccess) throw new ForbiddenException();

    await this.votingRepo.delete(votingId);

    return { success: true };
  }

  // Voting Option

  async addVotingOption(
    userId: string,
    channelId: string,
    votingId: number,
    data: AddVotingOptionDto,
  ) {
    const hasAccess = await this.canCreateVotingOption(
      userId,
      channelId,
      votingId,
      data.payload.type,
    );

    if (!hasAccess) throw new ForbiddenException();

    let card: VotingOptionCard;

    const where =
      data.payload.type === VotingOptionType.KinopoiskMovie ||
      data.payload.type === VotingOptionType.IgdbGame
        ? { cardId: data.payload.id }
        : { cardTitle: data.payload.title };

    const sameVotingOption = await this.votingOptionRepo.findOne({
      where: { voting: { id: votingId }, ...where },
    });

    if (sameVotingOption) throw new BadRequestException();

    if (data.payload.type === VotingOptionType.KinopoiskMovie) {
      card = await this.getKinopoiskMovieCard(data.payload.id);
    } else if (data.payload.type === VotingOptionType.IgdbGame) {
      card = await this.getIgdbGameCard(data.payload.id);
    } else {
      card = this.getCustomCard(data.payload);
    }

    const votingOption = this.votingOptionRepo.create({
      user: { id: channelId },
      voting: { id: votingId },
      type: data.payload.type,
      ...card,
    });

    const {
      voting: _,
      user: _1,
      ...savedVotingOption
    } = await this.votingOptionRepo.save(votingOption);

    return savedVotingOption;
  }

  async removeVotingOption(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionId: number,
  ) {
    const hasAccess = await this.canDeleteVotingOption(
      userId,
      channelId,
      votingId,
      votingOptionId,
    );

    if (!hasAccess) throw new ForbiddenException();

    await this.votingOptionRepo.delete(votingOptionId);

    return { success: true };
  }

  // Vote

  async addVote(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionId: number,
  ) {
    const hasAccess = await this.canCreateVote(
      userId,
      channelId,
      votingId,
      votingOptionId,
    );

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
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeVote(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionId: number,
    voteId: number,
  ) {
    const hasAccess = await this.canDeleteVote(
      userId,
      channelId,
      votingId,
      votingOptionId,
      voteId,
    );

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
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // check access methods

  private async canCreateVoting(
    userId: string,
    channelId: string,
  ): Promise<boolean> {
    if (userId === channelId) {
      const user = await this.usersService.findOne(userId);

      return !!user;
    }

    const [user, channel] = await Promise.all([
      this.usersService.findOne(userId),
      this.usersService.findOne(channelId),
    ]);

    if (!user || !channel) return false;

    const isEditor = await this.usersService.isEditor(channel, user);

    return isEditor;
  }

  private async canUpdateOrDeleteVoting(
    userId: string,
    channelId: string,
    votingId: number,
  ): Promise<boolean> {
    const [voting, user] = await Promise.all([
      this.votingRepo.findOne(votingId, { relations: ['user'] }),
      this.usersService.findOne(userId),
    ]);
    if (!voting) return false;

    const channel = voting.user;

    if (channel.id !== channelId) return false;

    const isOwner = channel.id === user.id;

    if (isOwner) return true;

    const isEditor = await this.usersService.isEditor(channel, user);

    return isEditor;
  }

  private async canCreateVotingOption(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionType: VotingOptionType,
  ) {
    const [voting, user] = await Promise.all([
      this.votingRepo.findOne(votingId, { relations: ['user'] }),
      this.usersService.findOne(userId),
    ]);

    if (!voting) return false;

    const channel = voting.user;

    if (channel.id !== channelId) return false;
    if (!voting.canManageVotingOptions) return false;

    const isOwner = channel.id === user.id;

    if (isOwner) return true;

    const isEditor = await this.usersService.isEditor(channel, user);

    if (isEditor) return true;

    const votingOptionsCount = await this.votingOptionRepo.count({
      where: { id: votingId },
    });

    if (votingOptionsCount >= voting.votingOptionsLimit) return false;
    if (!voting.allowedVotingOptionTypes.includes(votingOptionType))
      return false;

    const params = voting.userTypesParams;

    if (params.viewer.canAddOptions) return true;

    if (
      await this.usersService.checkUserTypes(channel, user, {
        mod: params.mod.canAddOptions,
        vip: params.vip.canAddOptions,
        subTier1: params.subTier1.canAddOptions,
        subTier2: params.subTier2.canAddOptions,
        subTier3: params.subTier3.canAddOptions,
        follower: params.follower.canAddOptions,
        minutesToFollowRequired:
          params.follower.minutesToFollowRequiredToAddOptions,
      })
    ) {
      return true;
    }

    return false;
  }

  private async canDeleteVotingOption(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionId: number,
  ) {
    const [votingOption, user] = await Promise.all([
      this.votingOptionRepo.findOne(votingOptionId, {
        relations: ['voting', 'voting.user'],
      }),
      this.usersService.findOne(userId),
    ]);
    if (!votingOption) return false;

    const voting = votingOption.voting;
    const channel = voting.user;

    if (voting.id !== votingId) return false;
    if (channel.id !== channelId) return false;

    const isOwner = channel.id === user.id;

    if (isOwner) return true;

    const [isEditor, votesCount] = await Promise.all([
      this.usersService.isEditor(channel, user),
      this.voteRepo.count({ where: { votingOption: { id: votingOptionId } } }),
    ]);

    if (isEditor) return true;

    if (!voting.canManageVotingOptions) return false;
    if (votingOption.userId !== user.id) return false;
    if (votesCount > 0) return false;

    return true;
  }

  private async canCreateVote(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionId: number,
  ) {
    const [votingOption, user] = await Promise.all([
      this.votingOptionRepo.findOne(votingOptionId, {
        relations: ['user', 'voting'],
      }),
      this.usersService.findOne(userId),
    ]);

    if (!votingOption) return false;

    const channel = votingOption.user;
    const voting = votingOption.voting;

    if (voting.id !== votingId) return false;
    if (channel.id !== channelId) return false;

    if (!votingOption.voting.canManageVotes) return false;

    const isOwner = channel.id === user.id;

    if (isOwner) return true;

    const isEditor = await this.usersService.isEditor(channel, user);

    if (isEditor) return true;

    const params = voting.userTypesParams;

    if (params.viewer.canVote) return true;

    if (
      await this.usersService.checkUserTypes(channel, user, {
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

  private async canDeleteVote(
    userId: string,
    channelId: string,
    votingId: number,
    votingOptionId: number,
    voteId: number,
  ) {
    const vote = await this.voteRepo.findOne(voteId, {
      relations: ['user', 'voting', 'votingOption', 'voting.user'],
    });

    if (!vote) return false;

    const votingOption = vote.votingOption;
    const voting = vote.voting;
    const channel = vote.voting.user;

    if (votingOption.id !== votingOptionId) return false;
    if (voting.id !== votingId) return false;
    if (channel.id !== channelId) return false;

    if (vote.user.id !== userId) return false;
    if (!vote.voting.canManageVotes) return false;

    return true;
  }

  private async getKinopoiskMovieCard(
    movieId: number,
  ): Promise<VotingOptionCard> {
    let response: GetFilmData;

    try {
      response = await this.kinopoiskApiService.getFilmData(movieId);
    } catch (e) {
      throw new BadRequestException();
    }

    const { kinopoiskId, nameRu, nameEn, year, genres, posterUrl } =
      response.data;

    const cardDescription = `${[year, genres.map((g) => g.genre).join(', ')]
      .filter(Boolean)
      .join(' - ')}`;

    return {
      cardId: kinopoiskId,
      cardTitle: nameRu,
      cardSubtitle: nameEn,
      cardDescription,
      cardImageUrl: posterUrl,
      cardUrl: `https://www.kinopoisk.ru/film/${kinopoiskId}/`,
    };
  }

  private async getIgdbGameCard(gameId: number): Promise<VotingOptionCard> {
    const body = `fields cover.image_id,first_release_date,genres.name,name,release_dates,slug; where id=${gameId};`;
    let response;

    try {
      response = await this.igdbApiService.game(body);
    } catch (e) {
      throw new BadRequestException();
    }

    if (response.data.length === 0) throw new BadRequestException();

    const {
      id,
      cover: { image_id },
      first_release_date,
      genres,
      name,
      slug,
    } = response.data[0];

    const year = first_release_date ? getYear(first_release_date) : undefined;

    const cardDescription = `${[year, genres.map((g) => g.name).join(', ')]
      .filter(Boolean)
      .join(' - ')}`;

    return {
      cardId: id,
      cardTitle: name,
      cardDescription,
      cardImageUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${image_id}.jpg`,
      cardUrl: `https://www.igdb.com/games/${slug}`,
    };
  }

  private getCustomCard({ title, description }: any): VotingOptionCard {
    return { cardTitle: title, cardDescription: description };
  }
}
