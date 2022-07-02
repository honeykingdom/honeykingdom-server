import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import { Mutex } from 'async-mutex';
import { Config } from '../config/config.interface';
import { IgdbApiOptions } from './entities/igdb-api-options.entity';

type AuthenticateResponse = {
  access_token: string;
  expires_in: number;
  token_type: 'bearer';
};

type Options = Pick<IgdbApiOptions, 'accessToken' | 'expiresIn'>;

@Injectable()
export class IgdbRequestService {
  private readonly logger = new Logger(IgdbRequestService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;

  private accessToken: string;

  private readonly mutex = new Mutex();

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
    @InjectRepository(IgdbApiOptions)
    private readonly igdbApiOptionsRepo: Repository<IgdbApiOptions>,
  ) {
    this.clientId = configService.get<string>('IGDB_CLIENT_ID');
    this.clientSecret = configService.get<string>('IGDB_CLIENT_SECRET');
  }

  async post<T>(url: string, data: string): Promise<AxiosResponse<T>> {
    await this.mutex.waitForUnlock();

    const response = await this.simplePost<T>(url, data);

    if (response.status === HttpStatus.UNAUTHORIZED) {
      this.logger.log('IGDB access token is expired');

      const release = await this.mutex.acquire();

      try {
        await this.authenticate();
      } finally {
        release();
      }

      return this.simplePost<T>(url, data);
    }

    return response;
  }

  private async simplePost<T>(url: string, data: string) {
    const headers = await this.getHeaders();
    return lastValueFrom(this.httpService.post<T>(url, data, { headers }));
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const options = await this.getOptions();

    if (options.accessToken) {
      this.accessToken = options.accessToken;
      return this.accessToken;
    }

    try {
      this.accessToken = await this.authenticate();
    } catch (e) {
      this.accessToken = '';
    }

    return this.accessToken;
  }

  private async authenticate() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
    });
    const url = `https://id.twitch.tv/oauth2/token?${params}`;

    let response: AxiosResponse<AuthenticateResponse>;

    try {
      response = await lastValueFrom(
        this.httpService.post<AuthenticateResponse>(url),
      );
    } catch (e) {
      this.logger.error("Can't get IGDB access token");

      await this.saveOptions({ accessToken: '', expiresIn: 0 });

      return '';
    }

    await this.saveOptions({
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    });

    return response.data.access_token;
  }

  private async getOptions() {
    let options: Options = await this.igdbApiOptionsRepo.findOne(1);

    if (!options) {
      options = { accessToken: '', expiresIn: 0 };

      await this.saveOptions(options);
    }

    return options;
  }

  private async saveOptions({ accessToken, expiresIn }: Options) {
    return this.igdbApiOptionsRepo.save({ id: 1, accessToken, expiresIn });
  }

  private async getHeaders() {
    const accessToken = await this.getAccessToken();
    const headers = {
      'Client-ID': this.clientId,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
    return headers;
  }
}
