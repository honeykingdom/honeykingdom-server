import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  getFilmData(id: string): Promise<GetFilmData> {
    const url = `https://kinopoiskapiunofficial.tech/api/v2.1/films/${id}`;
    const config = { headers: this.getHeaders() };

    return this.httpService.get<GetFilmDataResponse>(url, config).toPromise();
  }

  private getHeaders() {
    return { 'X-Api-Key': this.apiKey };
  }
}
