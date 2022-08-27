import type { TokenData } from './twitch-chat.interface';

export interface TwitchChatModuleOptions {
  clientId?: string;
  clientSecret?: string;
  tokenData?: TokenData;
}
