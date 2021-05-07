import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_SUPABASE } from 'src/app.constants';
import { TwitchChatModule } from 'src/twitch-chat/twitch-chat.module';
import { ChannelVoting } from './entities/ChannelVoting';
import { UserVote } from './entities/UserVote.entity';
import { VotesService } from './votes.service';

@Module({
  imports: [
    ConfigModule,
    TwitchChatModule.register({}),
    TypeOrmModule.forFeature([ChannelVoting, UserVote], TYPEORM_SUPABASE),
  ],
  providers: [VotesService],
})
export class HoneyVotesModule {}
