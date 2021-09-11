import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getYear } from 'date-fns';
import { POSTGRES_CONNECTION } from '../../../app.constants';
import { UsersService } from '../../users/users.service';
import { KinopoiskApiService } from '../../../kinopoisk-api/kinopoisk-api.service';
import { GetFilmData } from '../../../kinopoisk-api/kinopoisk-api.interface';
import { IgdbApiService } from '../../../igdb-api/igdb-api.service';
import { AddVotingOptionDto } from '../dto/addVotingOptionDto';
import { VotingOptionType } from '../../honey-votes.interface';
import {
  VotingOption,
  VotingOptionCard,
} from '../entities/VotingOption.entity';
import { Voting } from '../entities/Voting.entity';
import { Vote } from '../entities/Vote.entity';
import { User } from '../../users/entities/User.entity';

@Injectable()
export class VotingOptionsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly kinopoiskApiService: KinopoiskApiService,
    private readonly igdbApiService: IgdbApiService,
    @InjectRepository(Voting, POSTGRES_CONNECTION)
    private readonly votingRepo: Repository<Voting>,
    @InjectRepository(VotingOption, POSTGRES_CONNECTION)
    private readonly votingOptionRepo: Repository<VotingOption>,
    @InjectRepository(Vote, POSTGRES_CONNECTION)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  async addVotingOption(
    userId: string,
    data: AddVotingOptionDto,
  ): Promise<VotingOption> {
    const { votingId, payload } = data;
    const [author, voting] = await Promise.all([
      this.usersService.findOne(userId, { relations: ['credentials'] }),
      this.votingRepo.findOne(votingId, {
        relations: ['broadcaster', 'broadcaster.credentials'],
      }),
    ]);
    const hasAccess = await this.canCreateVotingOption(
      author,
      voting,
      payload.type,
    );

    if (!hasAccess) throw new ForbiddenException();

    const card = await this.getVotingOptionCard(data);

    const votingOption = this.votingOptionRepo.create({
      author,
      voting,
      type: payload.type,
      ...card,
    });

    const savedVotingOption = await this.votingOptionRepo.save(votingOption);

    delete savedVotingOption.voting;
    delete savedVotingOption.author;

    return savedVotingOption;
  }

  async removeVotingOption(
    userId: string,
    votingOptionId: number,
  ): Promise<void> {
    const hasAccess = await this.canDeleteVotingOption(userId, votingOptionId);

    if (!hasAccess) throw new ForbiddenException();

    await this.votingOptionRepo.delete(votingOptionId);
  }

  private async canCreateVotingOption(
    user: User,
    voting: Voting,
    votingOptionType: VotingOptionType,
  ) {
    if (!voting || !user) return false;
    if (!voting.canManageVotingOptions) return false;

    const isOwner = voting.broadcaster.id === user.id;

    if (isOwner) return true;

    const isEditor = await this.usersService.isEditor(voting.broadcaster, user);

    if (isEditor) return true;

    const votingOptionsCount = await this.votingOptionRepo.count({
      where: { id: voting.id },
    });

    if (votingOptionsCount >= voting.votingOptionsLimit) return false;
    if (!voting.allowedVotingOptionTypes.includes(votingOptionType))
      return false;

    const params = voting.userTypesParams;

    if (params.viewer.canAddOptions) return true;

    if (
      await this.usersService.checkUserTypes(voting.broadcaster, user, {
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

  private async canDeleteVotingOption(userId: string, votingOptionId: number) {
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

    const isOwner = votingOption.voting.broadcaster.id === user.id;

    if (isOwner) return true;

    const [isEditor, votesCount] = await Promise.all([
      this.usersService.isEditor(votingOption.voting.broadcaster, user),
      this.voteRepo.count({ where: { votingOption: { id: votingOptionId } } }),
    ]);

    if (isEditor) return true;

    if (!votingOption.voting.canManageVotingOptions) return false;
    if (votingOption.authorId !== user.id) return false;
    if (votesCount > 0) return false;

    return true;
  }

  private async getVotingOptionCard({ votingId, payload }: AddVotingOptionDto) {
    const where =
      payload.type === VotingOptionType.KinopoiskMovie ||
      payload.type === VotingOptionType.IgdbGame
        ? { cardId: payload.id }
        : { cardTitle: payload.title };

    const sameVotingOption = await this.votingOptionRepo.findOne({
      where: { voting: { id: votingId }, ...where },
    });

    if (sameVotingOption) throw new BadRequestException();

    if (payload.type === VotingOptionType.KinopoiskMovie) {
      return await this.getKinopoiskMovieCard(payload.id);
    }

    if (payload.type === VotingOptionType.IgdbGame) {
      return await this.getIgdbGameCard(payload.id);
    }

    return this.getCustomCard(payload);
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
