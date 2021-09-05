import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { KinopoiskApiModule } from '../../kinopoisk-api/kinopoisk-api.module';
import { IgdbApiModule } from '../../igdb-api/igdb-api.module';
import { UsersModule } from '../users/users.module';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { Voting } from './entities/Voting.entity';
import { VotingOption } from './entities/VotingOption.entity';
import { Vote } from './entities/Vote.entity';
import { User } from '../users/entities/User.entity';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    KinopoiskApiModule,
    IgdbApiModule,
    TypeOrmModule.forFeature(
      [User, Voting, VotingOption, Vote],
      POSTGRES_CONNECTION,
    ),
  ],
  providers: [VotesService],
  controllers: [VotesController],
})
export class VotesModule {}
