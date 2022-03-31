import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { Config } from '../config/config.interface';

// https://devcenter.heroku.com/articles/autoidle
@Injectable()
export class HerokuAwakeService {
  private static EVERY_15_MINUTES = '0 */15 * * * *';

  private readonly url: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {
    const baseUrl = this.configService.get('HEROKU_AWAKE_BASE_URL', {
      infer: true,
    });

    this.url = `${baseUrl}/api/ping`;
  }

  @Cron(HerokuAwakeService.EVERY_15_MINUTES)
  private handleCron() {
    lastValueFrom(this.httpService.get(this.url));
  }
}
