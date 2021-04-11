import { DynamicModule, Module } from '@nestjs/common';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';
import {
  TwitchChatModuleAsyncOptions,
  TwitchChatModuleOptions,
} from './twitch-chat-options.interface';

@Module({
  exports: [TwitchChatService],
})
export class TwitchChatModule {
  static register(options: TwitchChatModuleOptions): DynamicModule {
    return {
      module: TwitchChatModule,
      providers: [
        {
          provide: TwitchChatService,
          useFactory: () => this.createTwitchChatService(options),
        },
      ],
    };
  }

  static registerAsync(options: TwitchChatModuleAsyncOptions): DynamicModule {
    return {
      module: TwitchChatModule,
      imports: options.imports || [],
      providers: [
        {
          provide: TwitchChatService,
          useFactory: async (args) => {
            const twitchChatOptions = await options.useFactory(args);

            return this.createTwitchChatService(twitchChatOptions);
          },
          inject: options.inject || [],
        },
      ],
    };
  }

  private static async createTwitchChatService(
    options: TwitchChatModuleOptions,
  ) {
    const twitchChatService = new TwitchChatService(options);

    await twitchChatService.connect();

    return twitchChatService;
  }
}
