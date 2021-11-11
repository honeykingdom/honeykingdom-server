import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  POSTGRES_CONNECTION,
  TWITCH_CHAT_ANONYMOUS,
} from '../../app.constants';
import { TwitchChatModule } from '../../twitch-chat/twitch-chat.module';
import { UsersModule } from '../users/users.module';
import { ChatGoalService } from './chat-goal.service';
import { ChatGoalController } from './chat-goal.controller';
import { ChatGoal } from './entities/chat-goal.entity';
import { ChatGoalEvent } from './entities/chat-goal-event.entity';
import { ChatGoalData } from './entities/chat-goal-data.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature(
      [ChatGoal, ChatGoalEvent, ChatGoalData],
      POSTGRES_CONNECTION,
    ),
    TwitchChatModule.forFeature(TWITCH_CHAT_ANONYMOUS),
    UsersModule,
  ],
  providers: [ChatGoalService],
  controllers: [ChatGoalController],
})
export class ChatGoalModule {}
