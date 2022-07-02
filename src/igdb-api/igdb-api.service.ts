import { Injectable } from '@nestjs/common';
import { AxiosPromise } from 'axios';
import { Game } from 'igdb-api-types';
import { IgdbRequestService } from './igdb-request.service';

/**
 * There is a rate limit of 4 requests per second.
 *
 * https://api-docs.igdb.com/#rate-limits
 */
@Injectable()
export class IgdbApiService {
  constructor(private readonly igdbRequestService: IgdbRequestService) {}

  private static readonly GAMES_URL = 'https://api.igdb.com/v4/games';

  games(data: string): AxiosPromise<Game[]> {
    return this.igdbRequestService.post<Game[]>(IgdbApiService.GAMES_URL, data);
  }
}
