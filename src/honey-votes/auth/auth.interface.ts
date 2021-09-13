// https://github.com/oauth-everything/passport-twitch/blob/master/src/ApiData/User.ts
import { ApiProperty } from '@nestjs/swagger';

// https://dev.twitch.tv/docs/api/reference#get-users
export type TwitchUserResponse = {
  /** User’s broadcaster type: "partner", "affiliate", or "". */
  broadcaster_type: 'partner' | 'affiliate' | '';

  /** User’s channel description. */
  description: string;

  /** User’s display name. */
  displayName: string;

  /** User’s email address. Returned if the request includes the user:read:email scope. */
  email?: string;

  /** User’s ID. */
  id: string;

  /** User’s login name. */
  login: string;

  /** URL of the user’s offline image. */
  offline_image_url: string;

  /** URL of the user’s profile image. */
  profile_image_url: string;

  /** User’s type: "staff", "admin", "global_mod", or "". */
  type: 'staff' | 'admin' | 'global_mod' | '';

  /** Total number of views of the user’s channel. */
  view_count: number;

  /** Date when the user was created. */
  created_at: string;
};

export type TwitchStrategyUser = TwitchUserResponse & {
  accessToken: string;
  refreshToken: string;
};

export type JwtStrategyUser = {
  id: string;
  login: string;
};

export type JwtPayload = {
  sub: string;
  login: string;
  // iat: number;
  // exp: number;
};

export class RefreshTokenResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
