import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Cache } from 'cache-manager';

@Injectable()
export class InstagramService {
  static CACHE_TTL = 60 * 30; // 30 min

  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getLastPostUrl(nickname: string): Promise<string> {
    const cachedLastPostUrl = await this.cache.get<string>(nickname);

    if (cachedLastPostUrl) return cachedLastPostUrl;

    try {
      const userInfo = await this.getUserInfo(nickname);
      const lastPostId =
        userInfo.graphql.user.edge_owner_to_timeline_media.edges[0].node
          .shortcode;
      const url = `https://www.instagram.com/p/${lastPostId}/`;

      this.logger.log(`user: ${nickname}, url: ${url}`);
      this.cache.set<string>(nickname, url);

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
