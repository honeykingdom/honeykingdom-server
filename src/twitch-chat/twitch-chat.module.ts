import { DynamicModule, Module } from '@nestjs/common';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';
import { TwitchChatOptions } from './twitch-chat.types';

@Module({})
export class TwitchChatModule {
  static register(options: TwitchChatOptions = {}): DynamicModule {
    return {
      module: TwitchChatModule,
      providers: [
        {
          provide: TwitchChatService,
          useFactory: async () => {
            const twitchChatService = new TwitchChatService(options);

            await twitchChatService.connect();

            return twitchChatService;
          },
        },
      ],
      exports: [TwitchChatService],
    };
  }
}
