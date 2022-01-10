import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

const USER_ID = /app_insta\.user_id = '(\d+)';/;
const CSRF_TOKEN_REGEX = /<meta name="csrf-token" content="(.+)">/;
const XSRF_TOKEN_REGEX = /XSRF-TOKEN=([^;]+);/;
const INSTASTORIES_SESSION_REGEX = /instastories_session=([^;]+);/;

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private readonly httpService: HttpService) {}

  async getLastPostUrl(nickname: string): Promise<string> {
    try {
      const page = await lastValueFrom(
        this.httpService.get<string>(
          `https://anon-instastories.online/posts/${nickname}`,
        ),
      );

      const userId = page.data.match(USER_ID)[1];
      const csrfToken = page.data.match(CSRF_TOKEN_REGEX)[1];
      const xsrfToken =
        page.headers['set-cookie'][0].match(XSRF_TOKEN_REGEX)[1];
      const instastoriesSession = page.headers['set-cookie'][1].match(
        INSTASTORIES_SESSION_REGEX,
      )[1];

      const cookie = `cookie_message=true; accounts=${nickname}; XSRF-TOKEN=${xsrfToken}; instastories_session=${instastoriesSession}`;

      const response = await lastValueFrom(
        this.httpService.post(
          'https://anon-instastories.online/get-posts',
          `userId=${userId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              cookie,
              'X-CSRF-Token': csrfToken,
            },
          },
        ),
      );

      const lastPostId = response.data.posts[0].node.shortcode;
      const url = `https://www.instagram.com/p/${lastPostId}/`;

      this.logger.log(`user: ${nickname}, id: ${userId}, url: ${lastPostId}`);

      return url;
    } catch (e) {
      console.error(e);
    }

    return `https://www.instagram.com/${nickname}/`;
  }
}
