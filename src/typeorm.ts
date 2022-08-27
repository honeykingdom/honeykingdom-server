import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MONGODB_CONNECTION } from './app.constants';
import { Config } from './config/config.interface';
import { honeyVotesEntities } from './honey-votes/honey-votes.entities';
import { IgdbApiOptions } from './igdb-api/entities/igdb-api-options.entity';
import { Message } from './recent-messages/entities/message.entity';
import { TelegramChannel } from './telegram-api/entities/telegram-channel.entity';
import { TwitchChatOptions } from './twitch-chat/entities/twitch-chat-options.entity';

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
    url: configService.get('POSTGRES_URL', { infer: true }),
    entities: [
      ...honeyVotesEntities,
      TelegramChannel,
      IgdbApiOptions,
      TwitchChatOptions,
    ],
    synchronize: false,
    dropSchema: configService.get('NODE_ENV', { infer: true }) === 'test',
    logging: configService.get('NODE_ENV', { infer: true }) === 'development',
    // https://stackoverflow.com/questions/58220333
    keepConnectionAlive:
      configService.get('NODE_ENV', { infer: true }) === 'test',
  }),
  inject: [ConfigService],
});
