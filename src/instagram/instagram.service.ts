import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import NodeCache from 'node-cache';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  private readonly lastPostUrlsCache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hour

  constructor(private readonly httpService: HttpService) {}

  async getLastPostUrl(nickname: string): Promise<string> {
    if (this.lastPostUrlsCache.has(nickname)) {
      return this.lastPostUrlsCache.get(nickname);
    }

    try {
      const pageUrl = `https://www.anonigviewer.com/profile.php?u=${nickname}&c=posts`;
      const page = await lastValueFrom(this.httpService.get<string>(pageUrl));

      const sr = page.data.match(/var sr = "([^;]+)";/)[1];

      const response = await lastValueFrom(
        this.httpService.post(
          'https://www.anonigviewer.com/fetch.php',
          `sr=${sr}&a=`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Referer: pageUrl,
            },
          },
        ),
      );

      const lastPostId = response.data.d.posts[0].shortcode;
      const url = `https://www.instagram.com/p/${lastPostId}/`;

      this.logger.log(`user: ${nickname}, url: ${url}`);
      this.lastPostUrlsCache.set(nickname, url);

      return url;
    } catch (e) {
      console.error(e);
    }

    return `https://www.instagram.com/${nickname}/`;
  }
}
