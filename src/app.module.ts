import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config, validationSchema } from 'src/config/config.interface';
import { Message } from 'src/recent-messages/entities/message.entity';
import { RecentMessagesModule } from 'src/recent-messages/recent-messages.module';
import { TYPEORM_SUPABASE } from './app.constants';
import { HerokuAwakeModule } from './heroku-awake/heroku-awake.module';
import { HoneyBotModule } from './honey-bot/honey-bot.module';
import { ChannelVoting } from './honey-votes/entities/ChannelVoting';
import { UserVote } from './honey-votes/entities/UserVote.entity';
import { HoneyVotesModule } from './honey-votes/honey-votes.module';
import { TelegramChannel } from './telegram-api/entities/telegram-channel.entity';

@Module({
  imports: [
    HerokuAwakeModule,
    ConfigModule.forRoot({ validationSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<Config>) => ({
        type: 'mongodb',
        url: configService.get<string>('RECENT_MESSAGES_MONGODB_URI'),
        entities: [Message, TelegramChannel],
        synchronize: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: TYPEORM_SUPABASE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<Config>) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: parseInt(configService.get<string>('POSTGRES_PORT')),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DATABASE'),
        entities: [ChannelVoting, UserVote],
        synchronize: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    RecentMessagesModule,
    HoneyBotModule,
    HoneyVotesModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
