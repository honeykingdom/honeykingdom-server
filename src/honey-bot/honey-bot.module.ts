import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.interface';
import { TelegramApiModule } from 'src/telegram-api/telegram-api.module';
import { TwitchChatModule } from 'src/twitch-chat/twitch-chat.module';
import { HoneyBotService } from './honey-bot.service';

@Module({
  imports: [
    ConfigModule,
    TwitchChatModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<Config>) => ({
        username: configService.get('HONEY_BOT_USERNAME'),
        token: configService.get('HONEY_BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    TelegramApiModule,
  ],
  providers: [HoneyBotService],
  controllers: [],
})
export class HoneyBotModule {}
