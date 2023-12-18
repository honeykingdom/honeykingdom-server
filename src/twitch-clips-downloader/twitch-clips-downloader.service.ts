import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { escapers } from '@telegraf/entity';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import {
  SIZE_20_MB,
  THUMBNAIL_REGEX,
  TWITCH_CLIP_REGEX,
} from './twitch-clips-downloader.constants';
import {
  Clip,
  ClipInfo,
  GetClipsResponse,
  TwitchTokenResponse,
} from './twitch-clips-downloader.interface';

@Injectable()
export class TwitchClipsDownloaderService implements OnModuleDestroy {
  private accessToken = '';

  private readonly logger = new Logger(TwitchClipsDownloaderService.name);

  constructor(private readonly httpService: HttpService) {}

  async onModuleDestroy() {
    this.logger.log(`Revoking access token: ${this.accessToken}`);
    if (this.accessToken) this.revokeAccessToken();
  }

  private http<T = any>(
    config: AxiosRequestConfig<any>,
  ): Promise<AxiosResponse<T>> {
    return lastValueFrom(this.httpService.request(config));
  }

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
  private async getAccessToken() {
    const res = await this.http<TwitchTokenResponse>({
      url: 'https://id.twitch.tv/oauth2/token',
      method: 'POST',
      data: new URLSearchParams({
        client_id: process.env.TG_BOT_TWITCH_CLIENT_ID,
        client_secret: process.env.TG_BOT_TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });
    if (!res.data?.access_token) {
      throw new Error('Cannot get twitch access token');
    }
    return res.data;
  }

  private async fetchAndStoreToken() {
    try {
      const auth = await this.getAccessToken();
      this.accessToken = auth.access_token;
      this.logger.log(`New access token: ${this.accessToken}`);
    } catch (e) {
      this.logger.error(e.message, e.stack);
    }
  }

  // https://dev.twitch.tv/docs/authentication/revoke-tokens/
  private async revokeAccessToken() {
    const res = await this.http({
      url: 'https://id.twitch.tv/oauth2/revoke',
      method: 'POST',
      data: new URLSearchParams({
        client_id: process.env.TG_BOT_TWITCH_CLIENT_ID,
        token: this.accessToken,
      }),
    });
    return res.data;
  }

  // https://dev.twitch.tv/docs/api/reference#get-clips
  private fetchClip(slug: string) {
    return this.http<GetClipsResponse>({
      url: `https://api.twitch.tv/helix/clips?id=${slug}`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Client-ID': process.env.TG_BOT_TWITCH_CLIENT_ID,
      },
    });
  }

  private async getClip(slug: string) {
    if (!this.accessToken) await this.fetchAndStoreToken();
    let res: AxiosResponse<GetClipsResponse>;
    try {
      res = await this.fetchClip(slug);
    } catch (e) {
      if (e.response?.status === 401) {
        await this.fetchAndStoreToken();
        res = await this.fetchClip(slug);
      }
    }
    const clip = res.data.data[0];
    if (!clip) {
      throw new Error(
        `Cannot find a clip: ${slug}\nResponse:\n${JSON.stringify(res.data)}`,
      );
    }
    return clip;
  }

  private async getUrlContentLength(url: string): Promise<number | null> {
    let res: AxiosResponse<any, any>;
    try {
      res = await this.http({ url, method: 'HEAD' });
    } catch (e) {
      return null;
    }
    const contentLengthText = res.headers['content-length'];
    if (!contentLengthText) return null;
    return Number.parseInt(contentLengthText);
  }

  async getClipInfo(url: string): Promise<ClipInfo | null> {
    const m = TWITCH_CLIP_REGEX.exec(url);
    if (!m) return null;
    this.logger.log(url);
    const slug = m[1];
    let clip: Clip | undefined;
    try {
      clip = await this.getClip(slug);
    } catch (e) {
      this.logger.error(e.message, e.stack);
      return null;
    }
    if (!THUMBNAIL_REGEX.test(clip?.thumbnail_url || '')) return null;
    let downloadLink = clip.thumbnail_url.replace(THUMBNAIL_REGEX, '.mp4');
    const title = escapers.MarkdownV2(clip?.title);
    const channel = escapers.MarkdownV2(clip?.broadcaster_name);
    const author = escapers.MarkdownV2(clip?.creator_name);
    const caption = [
      `${title}\n\n*Channel*: _${channel}_`,
      `*Created by*: _${author}_`,
      `*Views*: _${clip?.view_count}_`,
    ].join(' \\| ');
    let size = await this.getUrlContentLength(downloadLink);
    if (!size) return null;
    if (size > SIZE_20_MB) {
      for (const quality of ['720', '480']) {
        const suffix = `-${quality}.mp4`;
        downloadLink = clip.thumbnail_url.replace(THUMBNAIL_REGEX, suffix);
        size = await this.getUrlContentLength(downloadLink);
        if (size !== null && size < SIZE_20_MB) {
          return {
            type: 'video',
            url: downloadLink,
            caption: `${caption}\n\n⚠️ _This video is ${quality}p\\. [Download original quality](${downloadLink})\\._`,
          };
        }
      }
      return {
        type: 'photo',
        url: clip.thumbnail_url,
        caption: `${caption}\n\n⚠️ _Can't upload more than 20MB, please use [this link](${downloadLink}) to download\\._`,
      };
    }
    return {
      type: 'video',
      url: downloadLink,
      caption: caption,
    };
  }
}
