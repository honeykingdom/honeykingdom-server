import { AxiosResponse } from 'axios';

export type TwitchCredentials = {
  clientId?: string;
  accessToken?: string;
};

export type TwitchRefreshTokenResponseSuccess = {
  access_token: string;
  refresh_token: string;
  scope: string;
};
export type TwitchRefreshTokenResponseFailure = {
  error: 'Bad Request';
  status: 400;
  message: 'Invalid refresh token';
};

export type GetChannelEditorsSuccess = {
  data: {
    user_id: string;
    user_name: string;
    created_at: string;
  }[];
};
export type GetChannelEditorsResponse =
  | (AxiosResponse<GetChannelEditorsSuccess> & { status: 200 })
  | (AxiosResponse & { status: 400 | 401 });

export type GetModeratorsSuccess = {
  data: {
    user_id: string;
    user_login: string;
    user_name: string;
  }[];
  pagination: { cursor?: string };
};
export type GetModeratorsResponse =
  | (AxiosResponse<GetModeratorsSuccess> & { status: 200 })
  | (AxiosResponse & { status: 400 | 401 });

export type CheckUserSubscriptionParams = {
  broadcaster_id: string;
  user_id: string;
};
export type CheckUserSubscriptionSuccess = {
  data: {
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    gifter_id?: string;
    gifter_login?: string;
    gifter_name?: string;
    is_gift: boolean;
    tier: '1000' | '2000' | '3000';
  }[];
};
export type CheckUserSubscriptionResponse =
  | (AxiosResponse<CheckUserSubscriptionSuccess> & { status: 200 })
  | (AxiosResponse & { status: 400 | 401 | 404 });

export type GetUserFollowsParams = {
  from_id?: string;
  to_id?: string;
  after?: string;
  first?: string;
};
export type GetUserFollowsSuccess = {
  total: number;
  data: {
    from_id: string;
    from_login: string;
    from_name: string;
    to_id: string;
    to_name: string;
    followed_at: string;
  }[];
  pagination: { cursor?: string };
};
export type GetUserFollowsResponse =
  | (AxiosResponse<GetUserFollowsSuccess> & { status: 200 })
  | (AxiosResponse & { status: 400 | 401 | 404 });
