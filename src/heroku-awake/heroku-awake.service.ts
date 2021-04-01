import * as https from 'https';
import * as http from 'http';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.interface';

@Injectable()
export class HerokuAwakeService {
  private readonly interval: number;

  constructor(private readonly configService: ConfigService<Config>) {
    this.interval = Number.parseInt(
      this.configService.get<string>('HEROKU_AWAKE_INTERVAL'),
    );

    const baseUrl = this.configService.get<string>('HEROKU_AWAKE_BASE_URL');
    const url = `${baseUrl}/api/ping`;

    setInterval(() => {
      if (url.startsWith('https')) {
        https.get(url);
      } else {
        http.get(url);
      }
    }, this.interval);
  }
}
