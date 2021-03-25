import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';

@Module({
  imports: [ConfigModule],
  providers: [TwitchChatService],
  exports: [TwitchChatService],
})
export class TwitchChatModule {}
