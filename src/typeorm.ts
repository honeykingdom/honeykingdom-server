import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MONGODB_CONNECTION } from './app.constants';
import { Config } from './config/config.interface';
import { honeyVotesEntities } from './honey-votes/honey-votes.entities';
import { IgdbApiOptions } from './igdb-api/entities/igdb-api-options.entity';
import { Message } from './recent-messages/entities/message.entity';
import { TelegramChannel } from './telegram-api/entities/telegram-channel.entity';

export const typeOrmMongoDbModule = TypeOrmModule.forRootAsync({
  name: MONGODB_CONNECTION,
  imports: [ConfigModule],
  useFactory: (configService: ConfigService<Config>) => ({
    type: 'mongodb',
    url: configService.get('MONGODB_URI', { infer: true }),
    entities: [Message],
    synchronize:
      configService.get('NODE_ENV', { infer: true }) !== 'production',
  }),
  inject: [ConfigService],
});

export const typeOrmPostgresModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService<Config>) => ({
    type: 'postgres',
    host: configService.get('POSTGRES_HOST', { infer: true }),
    port: parseInt(configService.get('POSTGRES_PORT', { infer: true })),
    username: configService.get('POSTGRES_USER', { infer: true }),
    password: configService.get('POSTGRES_PASSWORD', { infer: true }),
    database: configService.get('POSTGRES_DATABASE', { infer: true }),
    entities: [...honeyVotesEntities, TelegramChannel, IgdbApiOptions],
    synchronize: false,
    dropSchema: configService.get('NODE_ENV', { infer: true }) === 'test',
    logging: configService.get('NODE_ENV', { infer: true }) === 'development',
    // https://stackoverflow.com/questions/58220333
    keepConnectionAlive:
      configService.get('NODE_ENV', { infer: true }) === 'test',
  }),
  inject: [ConfigService],
});
