import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config/config.interface';

@Injectable()
export class HerokuAwakeService {
  private readonly interval: number;
  private readonly url: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {
    this.interval = Number.parseInt(
      this.configService.get('HEROKU_AWAKE_INTERVAL', { infer: true }),
    );
    const baseUrl = this.configService.get('HEROKU_AWAKE_BASE_URL', {
      infer: true,
    });
    this.url = `${baseUrl}/api/ping`;

    setInterval(() => {
      this.httpService.get(this.url);
    }, this.interval);
  }
}
