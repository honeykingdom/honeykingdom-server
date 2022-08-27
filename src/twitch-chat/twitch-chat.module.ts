import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwitchChatOptions } from './entities/twitch-chat-options.entity';
import { ConfigurableTwitchChatModule } from './twitch-chat.module-definition';
import { TwitchChatService } from './twitch-chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([TwitchChatOptions])],
  providers: [TwitchChatService],
  exports: [TwitchChatService],
})
export class TwitchChatModule extends ConfigurableTwitchChatModule {}
