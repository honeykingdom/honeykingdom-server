import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../recent-messages/entities/message.entity';
import { RecentMessagesController } from '../recent-messages/recent-messages.controller';
import { RecentMessagesService } from '../recent-messages/recent-messages.service';
import { TwitchChatModule } from '../twitch-chat/twitch-chat.module';
import { MONGODB_CONNECTION, TWITCH_CHAT_ANONYMOUS } from '../app.constants';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([Message], MONGODB_CONNECTION),
    TwitchChatModule.forFeature(TWITCH_CHAT_ANONYMOUS),
  ],
  providers: [RecentMessagesService],
  controllers: [RecentMessagesController],
})
export class RecentMessagesModule {}
