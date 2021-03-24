import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';
import { Message } from 'src/recent-messages/message/message.entity';
import { RecentMessagesController } from 'src/recent-messages/recent-messages.controller';
import { RecentMessagesService } from 'src/recent-messages/recent-messages.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Message])],
  providers: [RecentMessagesService, TwitchChatService],
  controllers: [RecentMessagesController],
})
export class RecentMessagesModule {}
