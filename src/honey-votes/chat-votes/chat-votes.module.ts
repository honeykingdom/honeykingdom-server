import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { TwitchChatModule } from '../../twitch-chat/twitch-chat.module';
import { UsersModule } from '../users/users.module';
import { ChatVotesService } from './chat-votes.service';
import { ChatVotesController } from './chat-votes.controller';
import { ChatVote } from './entities/ChatVote.entity';
import { ChatVoting } from './entities/ChatVoting.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChatVoting, ChatVote], POSTGRES_CONNECTION),
    TwitchChatModule.register({}),
    UsersModule,
  ],
  providers: [ChatVotesService],
  controllers: [ChatVotesController],
})
export class ChatVotesModule {}
