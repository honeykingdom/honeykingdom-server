import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TWITCH_CHAT_ANONYMOUS,
  TWITCH_CHAT_HONEYKINGDOM,
} from './app.constants';
import { Config } from './config/config.interface';
import { TwitchChatModule } from './twitch-chat/twitch-chat.module';

export const twitchChatAnonymousModule = TwitchChatModule.forRoot(
  TWITCH_CHAT_ANONYMOUS,
);

export const twitchChatHoneyKingdomModule = TwitchChatModule.forRootAsync(
  TWITCH_CHAT_HONEYKINGDOM,
  {
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService<Config>) => ({
      token: configService.get('HONEY_BOT_TOKEN', { infer: true }),
      username: configService.get('HONEY_BOT_USERNAME', { infer: true }),
    }),
    inject: [ConfigService],
  },
);
