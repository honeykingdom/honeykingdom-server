// https://github.com/nestjs/jwt/blob/master/lib/interfaces/jwt-module-options.interface.ts
import { ModuleMetadata } from '@nestjs/common';

// export const TWITCH_CHAT_MODULE_OPTIONS = 'TWITCH_CHAT_MODULE_OPTIONS';

export interface TwitchChatModuleOptions {
  username?: string;
  token?: string;
}

// export interface TwitchChatOptionsFactory {
//   createTwitchChatOptions():
//     | Promise<TwitchChatModuleOptions>
//     | TwitchChatModuleOptions;
// }

export interface TwitchChatModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  // useExisting?: Type<TwitchChatOptionsFactory>;
  // useClass?: Type<TwitchChatOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<TwitchChatModuleOptions> | TwitchChatModuleOptions;
  inject?: any[];
}
