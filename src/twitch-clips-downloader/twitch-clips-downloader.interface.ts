import { Scenes } from 'telegraf';
import { components } from '../twitch-api/twitch-api.generated';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Context extends Scenes.SceneContext {}

export type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: 'bearer';
};

export type GetClipsResponse = components['schemas']['GetClipsResponse'];
export type Clip = components['schemas']['Clip'];

export type ClipInfo = {
  type: 'photo' | 'video';
  url: string;
  caption: string;
};

export type ClipError = {
  type: 'error';
  description: string;
};
