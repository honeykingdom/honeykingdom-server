import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    HerokuAwakeModule,
    ConfigModule.forRoot({ validationSchema }),
    typeOrmMongoDbModule,
    typeOrmPostgresModule,
    twitchChatAnonymousModule,
    twitchChatHoneyKingdomModule,
    RecentMessagesModule,
    HoneyBotModule,
    HoneyVotesModule,
    InstagramModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
