import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TWITCH_CHAT_ANONYMOUS } from '../../app.constants';
import { TwitchApiModule } from '../../twitch-api/twitch-api.module';
import { TwitchChatModule } from '../../twitch-chat/twitch-chat.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    CacheModule.register({ ttl: UsersService.CACHE_TTL }),
    TwitchApiModule,
    TwitchChatModule.forFeature(TWITCH_CHAT_ANONYMOUS),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
