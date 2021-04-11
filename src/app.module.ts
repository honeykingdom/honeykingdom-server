import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config, validationSchema } from 'src/config/config.interface';
import { Message } from 'src/recent-messages/entities/message.entity';
import { RecentMessagesModule } from 'src/recent-messages/recent-messages.module';
import { HerokuAwakeModule } from './heroku-awake/heroku-awake.module';
import { HoneyBotModule } from './honey-bot/honey-bot.module';
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
    RecentMessagesModule,
    HoneyBotModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
