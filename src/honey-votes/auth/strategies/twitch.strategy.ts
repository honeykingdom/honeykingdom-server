import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitch-strategy';
import { Config } from '../../../config/config.interface';
import { TwitchStrategyUser, TwitchUserResponse } from '../auth.interface';

export const scope = [
  'channel:read:editors', // getChannelEditors
  'user:read:subscriptions', // checkUserSubscription
  'moderation:read', // getModerators
];

@Injectable()
export class TwitchStrategy extends PassportStrategy(Strategy, 'twitch') {
  constructor(configService: ConfigService<Config>) {
    const baseUrl = configService.get<string>('HONEY_VOTES_BASE_URL');

    super({
      clientID: configService.get<string>('HONEY_VOTES_TWITCH_CLIENT_ID'),
      clientSecret: configService.get<string>(
        'HONEY_VOTES_TWITCH_CLIENT_SECRET',
      ),
      callbackURL: `${baseUrl}/api/honey-votes/auth/twitch/redirect`,
      scope,
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: TwitchUserResponse,
  ): TwitchStrategyUser {
    return { ...profile, scope, accessToken, refreshToken };
  }
}
