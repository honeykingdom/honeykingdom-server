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
  ClipError,
  ClipInfo,
  GetClipsResponse,
  TwitchTokenResponse,
} from './twitch-clips-downloader.interface';

@Injectable()
export class TwitchClipsDownloaderService implements OnModuleDestroy {
  private accessToken = '';

  readonly logger = new Logger(TwitchClipsDownloaderService.name);

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
    return res.data;
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

  private getMp4Link(thumbnailUrl: string, quality: '480' | '720' | 'best') {
    return thumbnailUrl.replace(
      THUMBNAIL_REGEX,
      quality === 'best' ? '.mp4' : `-${quality}.mp4`,
    );
  }

  // For some clips lower quality links require 'AT-cm%7C' prefix after last '/'
  private getMp4LinkV2(mp4: string) {
    const i = mp4.lastIndexOf('/');
    return mp4.slice(0, i) + '/AT-cm%7C' + mp4.slice(i + 1);
  }

  getSlug(url: string) {
    const m = TWITCH_CLIP_REGEX.exec(url);
    if (!m) return null;
    return m[1];
  }

  async getClipInfo(slug: string): Promise<ClipInfo | ClipError> {
    let clipResponse: GetClipsResponse;
    try {
      clipResponse = await this.getClip(slug);
    } catch (e) {
      return {
        type: 'error',
        description: 'Something went wrong. Please try again later.',
      };
    }
    const clip = clipResponse.data?.[0];
    if (!clip) return { type: 'error', description: 'Cannot find this clip.' };
    if (!THUMBNAIL_REGEX.test(clip.thumbnail_url || '')) {
      return { type: 'error', description: 'Cannot get download link.' };
    }
    const mp4Link = this.getMp4Link(clip.thumbnail_url, 'best');
    const title = escapers.MarkdownV2(clip.title);
    const channel = escapers.MarkdownV2(clip.broadcaster_name);
    const channelLink = `[${channel}](https://www.twitch.tv/${clip.broadcaster_name})`;
    const author = escapers.MarkdownV2(clip.creator_name);
    const infoLine = [
      clip.broadcaster_name ? `*Channel*: _${channelLink}_` : null,
      clip.creator_name ? `*Created by*: _${author}_` : null,
      `*Views*: _${clip.view_count}_`,
    ]
      .filter(Boolean)
      .join(' \\| ');
    let size = await this.getUrlContentLength(mp4Link);
    if (!size)
      return {
        type: 'error',
        description: 'Something went wrong. Please try again later.',
      };
    if (size > SIZE_20_MB) {
      for (const quality of ['720', '480'] as const) {
        let mp4LinkLowRes = this.getMp4Link(clip.thumbnail_url, quality);
        size = await this.getUrlContentLength(mp4LinkLowRes);
        if (size === null) {
          mp4LinkLowRes = this.getMp4LinkV2(mp4LinkLowRes);
          size = await this.getUrlContentLength(mp4LinkLowRes);
        }
        if (size === null || size > SIZE_20_MB) continue;
        const warningLine = `⚠️ _This video is ${quality}p\\. [Download original quality](${mp4Link})\\._`;
        return {
          type: 'video',
          url: mp4LinkLowRes,
          caption: `${title}\n\n${infoLine}\n\n${warningLine}`,
        };
      }
      const warningLine = `⚠️ _Can't upload more than 20MB, please use [this link](${mp4Link}) to download\\._`;
      return {
        type: 'photo',
        url: clip.thumbnail_url,
        caption: `${title}\n\n${infoLine}\n\n${warningLine}`,
      };
    }
    return {
      type: 'video',
      url: mp4Link,
      caption: `${title}\n\n${infoLine}`,
    };
  }
}
