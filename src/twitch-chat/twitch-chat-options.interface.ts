import { ModuleMetadata } from '@nestjs/common/interfaces';

export type TwitchChatModuleOptions = {
  username?: string;
  token?: string;
};

export interface TwitchChatModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useFactory?: (
    ...args: any[]
  ) => Promise<TwitchChatModuleOptions> | TwitchChatModuleOptions;
  inject?: any[];
}
