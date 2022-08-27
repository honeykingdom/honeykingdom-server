import { Module, UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from '../config/config.interface';
import { LinkShortenerModule } from '../link-shortener/link-shortener.module';
import { TelegramApiModule } from '../telegram-api/telegram-api.module';
import { TwitchChatOptions } from '../twitch-chat/entities/twitch-chat-options.entity';
import { EMPTY_TOKEN_DATA } from '../twitch-chat/twitch-chat.constants';
import { TwitchChatModule } from '../twitch-chat/twitch-chat.module';
import { HoneyBotService } from './honey-bot.service';

@Module({
  imports: [
    ConfigModule,
    TwitchChatModule.registerAsync({
      imports: [ConfigModule, TypeOrmModule.forFeature([TwitchChatOptions])],
      useFactory: async (
        configService: ConfigService<Config>,
        twitchChatOptionsRepo: Repository<TwitchChatOptions>,
      ) => {
        const clientId = configService.get('HONEY_BOT_CLIENT_ID', {
          infer: true,
        });
        const clientSecret = configService.get('HONEY_BOT_CLIENT_SECRET', {
          infer: true,
        });

        const chatOptions = await twitchChatOptionsRepo.findOne(clientId);

        if (!chatOptions) {
          await twitchChatOptionsRepo.save({
            clientId: clientId,
            tokenData: EMPTY_TOKEN_DATA,
          });

          throw new UnauthorizedException(
            `No accessToken/refreshToken for clientId: ${clientId}`,
          );
        }

        return {
          clientId,
          clientSecret,
          tokenData: chatOptions.tokenData,
        };
      },
      inject: [ConfigService, getRepositoryToken(TwitchChatOptions)],
    }),
    TelegramApiModule,
    LinkShortenerModule,
  ],
  providers: [HoneyBotService],
  controllers: [],
})
export class HoneyBotModule {}
