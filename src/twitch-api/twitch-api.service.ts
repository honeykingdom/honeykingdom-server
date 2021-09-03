import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  CheckUserSubscriptionParams,
  CheckUserSubscriptionResponse,
  CheckUserSubscriptionSuccess,
  GetChannelEditorsResponse,
  GetChannelEditorsSuccess,
  GetModeratorsResponse,
  GetModeratorsSuccess,
  GetUserFollowsParams,
  GetUserFollowsResponse,
  GetUserFollowsSuccess,
  TwitchCredentials,
  TwitchRefreshTokenResponseSuccess,
} from './twitch-api.interface';

@Injectable()
export class TwitchApiService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accessToken: string;

  constructor(private readonly httpService: HttpService) {}

  /** https://dev.twitch.tv/docs/authentication#revoking-access-tokens */
  async revokeToken(accessToken: string, clientId: string): Promise<number> {
    const url = `https://id.twitch.tv/oauth2/revoke?client_id=${clientId}&token=${accessToken}`;
    const response = await this.httpService.post(url).toPromise();

    return response.status;
  }

  /** https://dev.twitch.tv/docs/authentication#refreshing-access-tokens */
  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<TwitchRefreshTokenResponseSuccess | null> {
    const url = `https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}`;

    try {
      const response = await lastValueFrom(
        this.httpService.post<TwitchRefreshTokenResponseSuccess>(url),
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  /** https://dev.twitch.tv/docs/api/reference#get-channel-editors */
  // Promise<GetChannelEditorsResponse>
  getChannelEditors(
    broadcasterId: string,
    credentials: TwitchCredentials,
  ): Promise<GetChannelEditorsResponse> {
    const url = `https://api.twitch.tv/helix/channels/editors?broadcaster_id=${broadcasterId}`;
    const config = { headers: this.getHeaders(credentials) };

    // TODO: fix types
    return lastValueFrom(this.httpService.get(url, config)) as any;
  }

  /** https://dev.twitch.tv/docs/api/reference#get-moderators */
  getModerators(
    broadcasterId: string,
    credentials: TwitchCredentials,
  ): Promise<GetModeratorsResponse> {
    const url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(this.httpService.get(url, config)) as any;
  }

  /** https://dev.twitch.tv/docs/api/reference#check-user-subscription */
  checkUserSubscription(
    params: CheckUserSubscriptionParams,
    credentials: TwitchCredentials,
  ): Promise<CheckUserSubscriptionResponse> {
    const urlParams = new URLSearchParams(params);
    const url = `https://api.twitch.tv/helix/subscriptions/user?${urlParams}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(this.httpService.get(url, config)) as any;
  }

  /** https://dev.twitch.tv/docs/api/reference#get-users-follows */
  getUserFollows(
    params: GetUserFollowsParams,
    credentials: TwitchCredentials = {},
  ): Promise<GetUserFollowsResponse> {
    const urlParams = new URLSearchParams(params);
    const url = `https://api.twitch.tv/helix/users/follows?${urlParams}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(this.httpService.get(url, config)) as any;
  }

  private getHeaders({ clientId, accessToken }: TwitchCredentials) {
    return {
      'Client-ID': clientId || this.clientId,
      Authorization: `Bearer ${accessToken || this.accessToken}`,
    };
  }
}
