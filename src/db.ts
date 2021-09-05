import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POSTGRES_CONNECTION } from './app.constants';
import { Config } from './config/config.interface';
import { honeyVotesEntities } from './honey-votes/honey-votes.entities';
import { Message } from './recent-messages/entities/message.entity';
import { TelegramChannel } from './telegram-api/entities/telegram-channel.entity';

export const typeOrmMongoDbModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService<Config>) => ({
    type: 'mongodb',
    url: configService.get('RECENT_MESSAGES_MONGODB_URI', { infer: true }),
    entities: [Message, TelegramChannel],
    synchronize:
      configService.get('NODE_ENV', { infer: true }) !== 'production',
  }),
  inject: [ConfigService],
});

export const typeOrmPostgresModule = TypeOrmModule.forRootAsync({
  name: POSTGRES_CONNECTION,
  imports: [ConfigModule],
  useFactory: (configService: ConfigService<Config>) => ({
    type: 'postgres',
    host: configService.get('POSTGRES_HOST', { infer: true }),
    port: parseInt(configService.get('POSTGRES_PORT', { infer: true })),
    username: configService.get('POSTGRES_USER', { infer: true }),
    password: configService.get('POSTGRES_PASSWORD', { infer: true }),
    database: configService.get('POSTGRES_DATABASE', { infer: true }),
    entities: honeyVotesEntities,
    synchronize:
      configService.get('NODE_ENV', { infer: true }) !== 'production',
    // logging: configService.get('NODE_ENV', { infer: true }) !== 'production',
    // https://stackoverflow.com/questions/58220333
    keepConnectionAlive:
      configService.get('NODE_ENV', { infer: true }) === 'test',
  }),
  inject: [ConfigService],
});
