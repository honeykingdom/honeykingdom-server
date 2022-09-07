import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { RecentMessagesController } from '../recent-messages/recent-messages.controller';
import { RecentMessagesService } from '../recent-messages/recent-messages.service';
import { TwitchChatModule } from '../twitch-chat/twitch-chat.module';
import { MYSQL_CONNECTION } from '../app.constants';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([ChatMessage], MYSQL_CONNECTION),
    TwitchChatModule.register({}),
  ],
  providers: [RecentMessagesService],
  controllers: [RecentMessagesController],
})
export class RecentMessagesModule {}
