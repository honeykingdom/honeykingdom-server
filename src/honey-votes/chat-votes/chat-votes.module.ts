import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  POSTGRES_CONNECTION,
  TWITCH_CHAT_ANONYMOUS,
} from '../../app.constants';
import { TwitchChatModule } from '../../twitch-chat/twitch-chat.module';
import { UsersModule } from '../users/users.module';
import { ChatVotesService } from './chat-votes.service';
import { ChatVotesController } from './chat-votes.controller';
import { ChatVote } from './entities/chat-vote.entity';
import { ChatVoting } from './entities/chat-voting.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChatVoting, ChatVote], POSTGRES_CONNECTION),
    TwitchChatModule.forFeature(TWITCH_CHAT_ANONYMOUS),
    UsersModule,
  ],
  providers: [ChatVotesService],
  controllers: [ChatVotesController],
})
export class ChatVotesModule {}
