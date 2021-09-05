import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { TwitchApiModule } from '../../twitch-api/twitch-api.module';
import { User } from './entities/User.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([User], POSTGRES_CONNECTION),
    TwitchApiModule,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
