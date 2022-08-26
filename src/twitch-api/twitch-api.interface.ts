export type TwitchCredentials = {
  clientId?: string;
  accessToken?: string;
};

export type UnauthorizedResponse = {
  status: 401;
  error: 'Unauthorized';
  message: 'Token invalid or missing required scope';
};

// RevokeToken
export type RevokeTokenParams = {
  client_id: string;
  token: string;
};

// RefreshToken
export type RefreshTokenParams = {
  refresh_token: string;
  client_id: string;
  client_secret: string;
};
export type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  scope: string[];
};
export type RefreshTokenError400 = {
  status: 400;
  error: 'Bad Request';
  message: 'Invalid refresh token';
};

// GetChannelEditors
export type GetChannelEditorsResponse = {
  data: {
    user_id: string;
    user_name: string;
    created_at: string;
  }[];
};

// GetVips
export type GetVipsResponse = {
  data: {
    user_id: string;
    user_name: string;
    user_login: string;
  }[];
  pagination: {
    cursor: string;
  };
};

// GetModerators
export type GetModeratorsResponse = {
  data: {
    user_id: string;
    user_login: string;
    user_name: string;
  }[];
  pagination: { cursor?: string };
};

// CheckUserSubscription
export type CheckUserSubscriptionParams = {
  broadcaster_id: string;
  user_id: string;
};
export type CheckUserSubscriptionResponse = {
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

// GetUserFollows
export type GetUserFollowsParams = {
  from_id?: string;
  to_id?: string;
  after?: string;
  first?: string;
};
export type GetUserFollowsResponse = {
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
