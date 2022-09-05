import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { Config } from '../config/config.interface';

// https://render.com/docs/free#free-web-services
@Injectable()
export class AppAwakeService {
  private readonly url: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
  ) {
    const baseUrl = this.configService.get('APP_BASE_URL', { infer: true });

    this.url = `${baseUrl}/api/ping`;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private handleCron() {
    lastValueFrom(this.httpService.get(this.url));
  }
}
