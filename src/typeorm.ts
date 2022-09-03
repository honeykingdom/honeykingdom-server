import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Config } from './config/config.interface';
import { honeyVotesEntities } from './honey-votes/honey-votes.entities';
import { IgdbApiOptions } from './igdb-api/entities/igdb-api-options.entity';
import { Message } from './recent-messages/entities/message.entity';
import { TelegramChannel } from './telegram-api/entities/telegram-channel.entity';
import { TwitchChatOptions } from './twitch-chat/entities/twitch-chat-options.entity';

export const typeOrmMongoDbFactory = (
  configService: ConfigService<Config>,
): TypeOrmModuleOptions => ({
  type: 'mongodb',
  url: configService.get('MONGODB_URI', { infer: true }),
  entities: [Message],
  synchronize: configService.get('NODE_ENV', { infer: true }) !== 'production',
});

export const typeOrmPostgresFactory = (
  configService: ConfigService<Config>,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get('POSTGRES_URL', { infer: true }),
  entities: [
    ...honeyVotesEntities,
    TelegramChannel,
    IgdbApiOptions,
    TwitchChatOptions,
  ],
  logging: configService.get('NODE_ENV', { infer: true }) === 'development',
});
