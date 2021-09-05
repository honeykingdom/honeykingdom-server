import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosPromise } from 'axios';
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

  /**
   * * 200 - OK
   * * 400 - Bad Request
   *
   * https://dev.twitch.tv/docs/authentication#revoking-access-tokens
   */
  async revokeToken(accessToken: string, clientId: string): Promise<boolean> {
    const url = `https://id.twitch.tv/oauth2/revoke?client_id=${clientId}&token=${accessToken}`;
    const response = await lastValueFrom(this.httpService.post(url));

    return response.status === 200;
  }

  /**
   * * 200 - OK
   * * 400 - Bad Request `AxiosError<RefreshTokenError400>`
   * * 401 - Unauthorized `AxiosError<UnauthorizedResponse>`
   *
   * https://dev.twitch.tv/docs/authentication#refreshing-access-tokens
   */
  refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): AxiosPromise<RefreshTokenResponse> {
    const urlParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const url = `https://id.twitch.tv/oauth2/token?${urlParams}`;

    return lastValueFrom(this.httpService.post<RefreshTokenResponse>(url));
  }

  /**
   * * 200 - OK
   * * 400 - Bad Request
   * * 401 - Unauthorized
   *
   * https://dev.twitch.tv/docs/api/reference#get-channel-editors
   */
  getChannelEditors(
    broadcasterId: string,
    credentials: TwitchCredentials,
  ): AxiosPromise<GetChannelEditorsResponse> {
    const url = `https://api.twitch.tv/helix/channels/editors?broadcaster_id=${broadcasterId}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get<GetChannelEditorsResponse>(url, config),
    );
  }

  /**
   * * 200 - OK
   * * 400 - Bad Request
   * * 401 - Unauthorized
   *
   * https://dev.twitch.tv/docs/api/reference#get-moderators
   */
  getModerators(
    broadcasterId: string,
    credentials: TwitchCredentials,
  ): AxiosPromise<GetModeratorsResponse> {
    const url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get<GetModeratorsResponse>(url, config),
    );
  }

  /**
   * * 200 - User subscription returned successfully
   * * 400 - Request was invalid
   * * 401 - Authorization failed
   * * 404 - User not subscribed to the channel
   *
   * https://dev.twitch.tv/docs/api/reference#check-user-subscription
   */
  checkUserSubscription(
    params: CheckUserSubscriptionParams,
    credentials: TwitchCredentials,
  ): AxiosPromise<CheckUserSubscriptionResponse> {
    const urlParams = new URLSearchParams(params);
    const url = `https://api.twitch.tv/helix/subscriptions/user?${urlParams}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get<CheckUserSubscriptionResponse>(url, config),
    );
  }

  /**
   * * 200 - OK
   * * 400 - Bad Request
   * * 401 - Unauthorized
   *
   * https://dev.twitch.tv/docs/api/reference#get-users-follows
   */
  getUserFollows(
    params: GetUserFollowsParams,
    credentials: TwitchCredentials = {},
  ): AxiosPromise<GetUserFollowsResponse> {
    const urlParams = new URLSearchParams(params);
    const url = `https://api.twitch.tv/helix/users/follows?${urlParams}`;
    const config = { headers: this.getHeaders(credentials) };

    return lastValueFrom(
      this.httpService.get<GetUserFollowsResponse>(url, config),
    );
  }

  private getHeaders({ clientId, accessToken }: TwitchCredentials) {
    return {
      'Client-ID': clientId || this.clientId,
      Authorization: `Bearer ${accessToken || this.accessToken}`,
    };
  }
}
