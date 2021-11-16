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
import { CreateVotingOptionDto } from '../dto/create-voting-option.dto';
import { VotingOptionType } from '../../honey-votes.constants';
import {
  VotingOption,
  VotingOptionCard,
} from '../entities/voting-option.entity';
import { Voting } from '../entities/voting.entity';
import { Vote } from '../entities/vote.entity';
import { User } from '../../users/entities/user.entity';
import { AxiosResponse } from 'axios';
import { Cover, Game } from 'igdb-api-types';

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

  async createVotingOption(
    userId: string,
    data: CreateVotingOptionDto,
  ): Promise<VotingOption> {
    const { votingId, type } = data;

    if (!data[type]) throw new BadRequestException();

    const [author, voting] = await Promise.all([
      this.usersService.findOne(userId, { relations: ['credentials'] }),
      this.votingRepo.findOne(votingId, {
        relations: ['broadcaster', 'broadcaster.credentials'],
      }),
    ]);
    const hasAccess = await this.canCreateVotingOption(author, voting, type);

    if (!hasAccess) throw new ForbiddenException();

    const card = await this.getVotingOptionCard(data);

    const votingOption = this.votingOptionRepo.create({
      author,
      authorLogin: author.login,
      voting,
      type,
      ...card,
    });

    const savedVotingOption = await this.votingOptionRepo.save(votingOption);

    delete savedVotingOption.voting;
    delete savedVotingOption.author;

    return savedVotingOption;
  }

  async deleteVotingOption(
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
  ): Promise<boolean> {
    if (!voting || !user) return false;
    if (!voting.canManageVotingOptions) return false;

    const isOwner = voting.broadcaster.id === user.id;

    if (isOwner) return true;

    const isEditor = await this.usersService.isEditor(voting.broadcaster, user);

    if (isEditor) return true;

    const [votingOptionsCount, votingOptionsByUserCount] = await Promise.all([
      this.votingOptionRepo.count({ where: { voting: voting } }),
      this.votingOptionRepo.count({
        where: { voting: voting, author: user },
      }),
    ]);

    if (votingOptionsCount >= voting.votingOptionsLimit) return false;
    if (votingOptionsByUserCount >= 1) return false;
    if (!voting.allowedVotingOptionTypes.includes(votingOptionType))
      return false;

    const params = voting.permissions;

    if (params.viewer.canAddOptions) return true;

    if (
      await this.usersService.checkUserTypes(voting.broadcaster, user, {
        mod: params.mod.canAddOptions,
        vip: params.vip.canAddOptions,
        sub: params.sub.canAddOptions,
        follower: params.follower.canAddOptions,
        minutesToFollowRequired:
          params.follower.minutesToFollowRequiredToAddOptions,
        subTierRequired: params.sub.subTierRequiredToAddOptions,
      })
    ) {
      return true;
    }

    return false;
  }

  private async canDeleteVotingOption(
    userId: string,
    votingOptionId: number,
  ): Promise<boolean> {
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

  private async getVotingOptionCard(data: CreateVotingOptionDto) {
    const payload = data[data.type];

    type PayloadCustom = CreateVotingOptionDto[VotingOptionType.Custom];
    type PayloadKp = CreateVotingOptionDto[VotingOptionType.KinopoiskMovie];
    type PayloadIgdb = CreateVotingOptionDto[VotingOptionType.IgdbGame];

    let where = {};

    if (data.type === VotingOptionType.Custom) {
      where = { cardTitle: (payload as PayloadCustom).title };
    }
    if (data.type === VotingOptionType.KinopoiskMovie) {
      where = { cardId: (payload as PayloadKp).id };
    }
    if (data.type === VotingOptionType.IgdbGame) {
      where = { cardId: (payload as PayloadIgdb).slug };
    }

    const sameVotingOption = await this.votingOptionRepo.findOne({
      where: { voting: { id: data.votingId }, ...where },
    });

    if (sameVotingOption) throw new BadRequestException();

    if (data.type === VotingOptionType.KinopoiskMovie) {
      return await this.getKinopoiskMovieCard((payload as PayloadKp).id);
    }

    if (data.type === VotingOptionType.IgdbGame) {
      return await this.getIgdbGameCard((payload as PayloadIgdb).slug);
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

    const {
      kinopoiskId,
      nameRu,
      nameEn,
      year,
      genres,
      posterUrl,
      posterUrlPreview,
    } = response.data;

    const cardDescription = `${[year, genres.map((g) => g.genre).join(', ')]
      .filter(Boolean)
      .join(' - ')}`;

    return {
      cardId: `${kinopoiskId}`,
      cardTitle: nameRu,
      cardSubtitle: nameEn,
      cardDescription,
      cardImageUrl: posterUrlPreview || posterUrl,
      cardUrl: `https://www.kinopoisk.ru/film/${kinopoiskId}/`,
    };
  }

  private async getIgdbGameCard(gameSlug: string): Promise<VotingOptionCard> {
    const body = `fields cover.image_id,first_release_date,genres.name,name,release_dates,slug; where slug="${gameSlug}";`;
    let response: AxiosResponse<Game[]>;

    try {
      response = await this.igdbApiService.game(body);
    } catch (e) {
      throw new BadRequestException();
    }

    if (response.data.length === 0) throw new BadRequestException();

    const { cover, first_release_date, genres, name, slug } = response.data[0];
    const coverImageId = (cover as Cover).image_id;

    const year = first_release_date
      ? getYear(first_release_date * 1000)
      : undefined;

    const cardDescription = `${[year, genres.map((g) => g.name).join(', ')]
      .filter(Boolean)
      .join(' - ')}`;

    return {
      cardId: slug,
      cardTitle: name,
      cardDescription,
      cardImageId: coverImageId,
      cardUrl: `https://www.igdb.com/games/${slug}`,
    };
  }

  private getCustomCard({ title, description }: any): VotingOptionCard {
    return { cardTitle: title, cardDescription: description };
  }
}
