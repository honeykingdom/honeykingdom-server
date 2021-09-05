import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
// import { ChatVotesModule } from './chat-votes/chat-votes.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [AuthModule, VotesModule /* ChatVotesModule */],
})
export class HoneyVotesModule {}
