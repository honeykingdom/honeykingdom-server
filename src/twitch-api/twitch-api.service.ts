import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  CheckUserSubscriptionParams,
  CheckUserSubscriptionResponse,
  GetChannelEditorsResponse,
  GetModeratorsResponse,
  GetUserFollowsParams,
  GetUserFollowsResponse,
  RefreshTokenResponse,
  TwitchCredentials,
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
    const response = await lastValueFrom(this.httpService.post(url));

    return response.status;
  }

  /** https://dev.twitch.tv/docs/authentication#refreshing-access-tokens */
  refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<RefreshTokenResponse> {
    const urlParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const url = `https://id.twitch.tv/oauth2/token?${urlParams}`;

    return lastValueFrom(
      this.httpService.post(url),
    ) as Promise<RefreshTokenResponse>;
  }

  /** https://dev.twitch.tv/docs/api/reference#get-channel-editors */
  getChannelEditors(
    broadcasterId: string,
    credentials: TwitchCredentials,
  ): Promise<GetChannelEditorsResponse> {
    const url = `https://api.twitch.tv/helix/channels/editors?broadcaster_id=${broadcasterId}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get(url, config),
    ) as Promise<GetChannelEditorsResponse>;
  }

  /** https://dev.twitch.tv/docs/api/reference#get-moderators */
  getModerators(
    broadcasterId: string,
    credentials: TwitchCredentials,
  ): Promise<GetModeratorsResponse> {
    const url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get(url, config),
    ) as Promise<GetModeratorsResponse>;
  }

  /** https://dev.twitch.tv/docs/api/reference#check-user-subscription */
  checkUserSubscription(
    params: CheckUserSubscriptionParams,
    credentials: TwitchCredentials,
  ): Promise<CheckUserSubscriptionResponse> {
    const urlParams = new URLSearchParams(params);
    const url = `https://api.twitch.tv/helix/subscriptions/user?${urlParams}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get(url, config),
    ) as Promise<CheckUserSubscriptionResponse>;
  }

  /** https://dev.twitch.tv/docs/api/reference#get-users-follows */
  getUserFollows(
    params: GetUserFollowsParams,
    credentials: TwitchCredentials = {},
  ): Promise<GetUserFollowsResponse> {
    const urlParams = new URLSearchParams(params);
    const url = `https://api.twitch.tv/helix/users/follows?${urlParams}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get(url, config),
    ) as Promise<GetUserFollowsResponse>;
  }

  private getHeaders({ clientId, accessToken }: TwitchCredentials) {
    return {
      'Client-ID': clientId || this.clientId,
      Authorization: `Bearer ${accessToken || this.accessToken}`,
    };
  }
}
