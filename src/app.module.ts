import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validationSchema } from './config/config.interface';
import { RecentMessagesModule } from './recent-messages/recent-messages.module';
import { HerokuAwakeModule } from './heroku-awake/heroku-awake.module';
import { HoneyBotModule } from './honey-bot/honey-bot.module';
import { HoneyVotesModule } from './honey-votes/honey-votes.module';
import { InstagramModule } from './instagram/instagram.module';
import { typeOrmMongoDbModule, typeOrmPostgresModule } from './typeorm';
import {
  twitchChatAnonymousModule,
  twitchChatHoneyKingdomModule,
} from './twitch-chat';
import { Formula1Module } from './formula1/formula1.module';

@Module({
  imports: [
    HerokuAwakeModule,
    ConfigModule.forRoot({ validationSchema }),
    ScheduleModule.forRoot(),
    typeOrmMongoDbModule,
    typeOrmPostgresModule,
    twitchChatAnonymousModule,
    twitchChatHoneyKingdomModule,
    RecentMessagesModule,
    HoneyBotModule,
    HoneyVotesModule,
    InstagramModule,
    Formula1Module,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
