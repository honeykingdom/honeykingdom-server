import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { TwitchApiModule } from '../../twitch-api/twitch-api.module';
import { User } from './entities/User.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User], POSTGRES_CONNECTION),
    TwitchApiModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
