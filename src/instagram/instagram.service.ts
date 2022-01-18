import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import NodeCache from 'node-cache';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  private readonly lastPostUrlsCache = new NodeCache({ stdTTL: 60 * 30 }); // 30 min

  constructor(private readonly httpService: HttpService) {}

  async getLastPostUrl(nickname: string): Promise<string> {
    if (this.lastPostUrlsCache.has(nickname)) {
      return this.lastPostUrlsCache.get(nickname);
    }

    try {
      const userInfo = await this.getUserInfo(nickname);
      const lastPostId =
        userInfo.graphql.user.edge_owner_to_timeline_media.edges[0].node
          .shortcode;
      const url = `https://www.instagram.com/p/${lastPostId}/`;

      this.logger.log(`user: ${nickname}, url: ${url}`);
      this.lastPostUrlsCache.set(nickname, url);

      return url;
    } catch (e) {
      console.error(e);
    }

    return `https://www.instagram.com/${nickname}/`;
  }

  private async getUserInfo(nickname: string): Promise<any> {
    const url = `https://www.instagram.com/${nickname}/?__a=1`;
    const cookie = `sessionid=${process.env.INSTAGRAM_SESSION_ID}`;
    const response = await lastValueFrom(
      this.httpService.get(url, { headers: { cookie } }),
    );

    return response.data;
  }
}
