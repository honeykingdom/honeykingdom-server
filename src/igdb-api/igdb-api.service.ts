import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Config } from '../config/config.interface';

/**
 * There is a rate limit of 4 requests per second.
 *
 * https://api-docs.igdb.com/#rate-limits
 */
@Injectable()
export class IgdbApiService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accessToken: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {
    this.clientId = configService.get<string>('IGDB_CLIENT_ID');
    this.clientSecret = configService.get<string>('IGDB_CLIENT_SECRET');
    this.accessToken = configService.get<string>('IGDB_ACCESS_TOKEN');
  }

  game(body: string) {
    const url = 'https://api.igdb.com/v4/games';
    const config = { body, headers: this.getHeaders() };

    return lastValueFrom(this.httpService.post(url, config));
  }

  private getHeaders() {
    return {
      'Client-ID': this.clientId,
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
    };
  }
}
