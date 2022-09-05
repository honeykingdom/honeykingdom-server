import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { MONGODB_CONNECTION } from './app.constants';
import { validate } from './config/config.interface';
import LogsMiddleware from './custom-logger/middlewares/log.middleware';
import { CustomLoggerModule } from './custom-logger/custom-logger.module';
import { typeOrmMongoDbFactory, typeOrmPostgresFactory } from './typeorm';
import { RecentMessagesModule } from './recent-messages/recent-messages.module';
import { AppAwakeModule } from './app-awake/app-awake.module';
import { HoneyBotModule } from './honey-bot/honey-bot.module';
import { HoneyVotesModule } from './honey-votes/honey-votes.module';
import { InstagramModule } from './instagram/instagram.module';
// import { Formula1Module } from './formula1/formula1.module';

@Module({
  imports: [
    CustomLoggerModule,
    AppAwakeModule,
    ConfigModule.forRoot({ validate }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      name: MONGODB_CONNECTION,
      imports: [ConfigModule],
      useFactory: typeOrmMongoDbFactory,
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: typeOrmPostgresFactory,
      inject: [ConfigService],
    }),
    RecentMessagesModule,
    HoneyBotModule,
    HoneyVotesModule,
    InstagramModule,
    // Formula1Module,
  ],
  providers: [],
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogsMiddleware).forRoutes('*');
  }
}
