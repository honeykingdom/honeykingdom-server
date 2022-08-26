import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwitchApiModule } from '../../twitch-api/twitch-api.module';
import { User } from './entities/user.entity';
import { TwitchUsersService } from './twitch-users.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    CacheModule.register({ ttl: UsersService.CACHE_TTL }),
    TwitchApiModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, TwitchUsersService],
  exports: [UsersService],
})
export class UsersModule {}
