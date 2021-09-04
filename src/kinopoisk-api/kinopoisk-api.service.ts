import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Config } from '../config/config.interface';
import { GetFilmData, GetFilmDataResponse } from './kinopoisk-api.interface';

@Injectable()
export class KinopoiskApiService {
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = configService.get<string>('KINOPOISK_API_KEY');
  }

  getFilmData(id: number): Promise<GetFilmData> {
    const url = `https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`;
    const config = { headers: this.getHeaders() };

    return lastValueFrom(
      this.httpService.get<GetFilmDataResponse>(url, config),
    );
  }

  private getHeaders() {
    return { 'X-Api-Key': this.apiKey };
  }
}
