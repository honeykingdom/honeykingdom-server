import * as https from 'https';
import * as http from 'http';
import { Injectable } from '@nestjs/common';

// 15 min
const DEFAULT_INTERVAL = 15 * 60 * 1000;

@Injectable()
export class HerokuAwakeService {
  constructor() {
    setInterval(() => {
      const url = `${process.env.BASE_URL}/api/ping`;

      if (url.startsWith('https')) {
        https.get(url);
      } else {
        http.get(url);
      }
    }, DEFAULT_INTERVAL);
  }
}
