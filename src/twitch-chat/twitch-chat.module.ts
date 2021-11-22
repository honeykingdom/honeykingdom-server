import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { Chat } from 'twitch-js';
import { TwitchChatModuleAsyncOptions } from './twitch-chat-options.interface';
import { TwitchChatModuleOptions } from './twitch-chat-options.interface';
import { TwitchChatService } from './twitch-chat.service';
import {
  createConnection,
  getChatConnectionToken,
  getChatModuleToken,
} from './twitch-chat.utils';

@Global()
@Module({})
export class TwitchChatModule {
  static forRoot(
    connectionName: string,
    options: TwitchChatModuleOptions = {},
  ): DynamicModule {
    const chatConnectionProvider: Provider = {
      provide: getChatConnectionToken(connectionName),
      useFactory: () => createConnection(options, connectionName),
    };

    return {
      module: TwitchChatModule,
      providers: [chatConnectionProvider],
      exports: [chatConnectionProvider],
    };
  }

  static forRootAsync(
    connectionName: string,
    options: TwitchChatModuleAsyncOptions,
  ): DynamicModule {
    const chatConnectionProvider: Provider = {
      provide: getChatConnectionToken(connectionName),
      useFactory: async (...rest: any) =>
        createConnection(await options.useFactory(...rest), connectionName),
      inject: options.inject || [],
    };

    return {
      module: TwitchChatModule,
      imports: options.imports,
      providers: [chatConnectionProvider],
      exports: [chatConnectionProvider],
    };
  }

  static forFeature(connectionName: string): DynamicModule {
    const provider: Provider = {
      provide: getChatModuleToken(connectionName),
      useFactory: (chat: Chat) => new TwitchChatService(chat, connectionName),
      inject: [getChatConnectionToken(connectionName)],
    };

    return {
      module: TwitchChatModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
