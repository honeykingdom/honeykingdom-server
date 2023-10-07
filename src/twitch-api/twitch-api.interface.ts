import { components, operations } from './twitch-api.generated';

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
export type GetChannelEditorsResponse =
  components['schemas']['GetChannelEditorsResponse'];

// GetVips
export type GetVipsResponse = components['schemas']['GetVIPsResponse'];

// GetModerators
export type GetModeratorsResponse =
  components['schemas']['GetModeratorsResponse'];

// CheckUserSubscription
export type CheckUserSubscriptionParams =
  operations['check-user-subscription']['parameters']['query'];
export type CheckUserSubscriptionResponse =
  components['schemas']['CheckUserSubscriptionResponse'];

// GetUserFollows
export type GetChannelFollowersParams =
  operations['get-channel-followers']['parameters']['query'];
export type GetChannelFollowersResponse =
  components['schemas']['GetChannelFollowersResponse'];
