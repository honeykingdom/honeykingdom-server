import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import ms from 'ms';
import { Config } from '../config/config.interface';

// https://devcenter.heroku.com/articles/autoidle
@Injectable()
export class HerokuAwakeService {
  private readonly interval: number;
  private readonly url: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {
    const awakeInterval = this.configService.get('HEROKU_AWAKE_INTERVAL', {
      infer: true,
    });

    this.interval = ms(awakeInterval);

    const baseUrl = this.configService.get('HEROKU_AWAKE_BASE_URL', {
      infer: true,
    });

    this.url = `${baseUrl}/api/ping`;

    setInterval(() => {
      lastValueFrom(this.httpService.get(this.url));
    }, this.interval);
  }
}
