import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from 'src/config/config.interface';
import { Message } from 'src/recent-messages/entities/message.entity';
import { RecentMessagesModule } from 'src/recent-messages/recent-messages.module';
import { HerokuAwakeModule } from './heroku-awake/heroku-awake.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<Config>) => ({
        type: 'mongodb',
        url: configService.get<string>('MONGODB_URI'),
        entities: [Message],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    RecentMessagesModule,
    HerokuAwakeModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
