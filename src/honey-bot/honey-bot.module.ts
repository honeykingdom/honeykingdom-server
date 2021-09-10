import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TWITCH_CHAT_HONEYKINGDOM } from '../app.constants';
import { LinkShortenerModule } from '../link-shortener/link-shortener.module';
import { TelegramApiModule } from '../telegram-api/telegram-api.module';
import { TwitchChatModule } from '../twitch-chat/twitch-chat.module';
import { HoneyBotService } from './honey-bot.service';

@Module({
  imports: [
    ConfigModule,
    TwitchChatModule.forFeature(TWITCH_CHAT_HONEYKINGDOM),
    TelegramApiModule,
    LinkShortenerModule,
  ],
  providers: [HoneyBotService],
  controllers: [],
})
export class HoneyBotModule {}
