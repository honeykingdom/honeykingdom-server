import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/recent-messages/entities/message.entity';
import { RecentMessagesController } from 'src/recent-messages/recent-messages.controller';
import { RecentMessagesService } from 'src/recent-messages/recent-messages.service';
import { TwitchChatModule } from 'src/twitch-chat/twitch-chat.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Message]),
    TwitchChatModule.register({}),
  ],
  providers: [RecentMessagesService],
  controllers: [RecentMessagesController],
})
export class RecentMessagesModule {}
