import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { IgdbGame } from './igdb-game.entity';
import { IgdbApiService } from '../../igdb-api/igdb-api.service';

@Injectable()
export class GamesService {
  private static CACHE_KEY = {
    search: (s: string) => `search.${s}`,
  };

  constructor(
    private readonly igdbApiService: IgdbApiService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async searchGames(s: string): Promise<IgdbGame[]> {
    if (!s) throw new BadRequestException();

    const search = s.trim().replace(/"/g, '');
    const key = GamesService.CACHE_KEY.search(search);
    const cachedResult = await this.cache.get(key);

    if (cachedResult) return cachedResult as IgdbGame[];

    const body = `search "${search}"; fields cover.image_id,first_release_date,genres.name,name,release_dates,slug;`;
    const result = await this.igdbApiService.games(body);

    await this.cache.set(key, result.data);

    return result.data as IgdbGame[];
  }
}
