import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { escapers } from '@telegraf/entity';
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

  async onModuleDestroy() {
    if (this.accessToken) this.revokeAccessToken();
  }

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
  private async getAccessToken() {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TG_BOT_TWITCH_CLIENT_ID,
        client_secret: process.env.TG_BOT_TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }).toString(),
    });
    if (res.status !== 200) {
      throw new Error('Cannot get twitch access token');
    }
    const json = (await res.json()) as TwitchTokenResponse;
    if (!json?.access_token) {
      throw new Error('Cannot get twitch access token');
    }
    return json;
  }

  private async fetchAndStoreToken() {
    const auth = await this.getAccessToken();
    this.accessToken = auth.access_token;
    console.log(`New access token: ${this.accessToken}`);
  }

  // https://dev.twitch.tv/docs/authentication/revoke-tokens/
  private async revokeAccessToken() {
    const res = await fetch(`https://id.twitch.tv/oauth2/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TG_BOT_TWITCH_CLIENT_ID,
        token: this.accessToken,
      }).toString(),
    });
    return res.json();
  }

  // https://dev.twitch.tv/docs/api/reference#get-clips
  private async fetchClip(slug: string) {
    return fetch(`https://api.twitch.tv/helix/clips?id=${slug}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Client-ID': process.env.TG_BOT_TWITCH_CLIENT_ID,
      },
    });
  }

  private async getClip(slug: string) {
    if (!this.accessToken) await this.fetchAndStoreToken();
    let res = await this.fetchClip(slug);
    if (res.status === 401) {
      await this.fetchAndStoreToken();
      res = await this.fetchClip(slug);
    }
    if (res.status !== 200) {
      throw new Error(`Cannot find the clip: ${slug}`);
    }
    const json = (await res.json()) as GetClipsResponse;
    return json.data[0];
  }

  async getClipInfo(url: string): Promise<ClipInfo | null> {
    const m = TWITCH_CLIP_REGEX.exec(url);
    if (!m) return null;
    const slug = m[1];
    let clip: Clip | undefined;
    try {
      clip = await this.getClip(slug);
    } catch (e) {
      console.error(e);
      return null;
    }
    if (!THUMBNAIL_REGEX.test(clip?.thumbnail_url || '')) return null;
    const downloadLink = clip.thumbnail_url.replace(THUMBNAIL_REGEX, '.mp4');
    const res = await fetch(downloadLink, { method: 'HEAD' });
    const sizeText = res.headers.get('Content-Length');
    if (!sizeText) return null;
    const title = escapers.MarkdownV2(clip?.title);
    const channel = escapers.MarkdownV2(clip?.broadcaster_name);
    const author = escapers.MarkdownV2(clip?.creator_name);
    const caption = `${title}\n\n*Channel*: _${channel}_ \\| *Created by*: _${author}_ \\| *Views*: _${clip?.view_count}_`;
    const size = Number.parseInt(sizeText);
    return size > SIZE_20_MB
      ? {
          type: 'photo',
          url: clip.thumbnail_url,
          caption: `${caption}\n\n⚠️ _Can't upload more than 20MB, please use [this link](${downloadLink}) to download\\._`,
        }
      : {
          type: 'video',
          url: downloadLink,
          caption: caption,
        };
  }
}
