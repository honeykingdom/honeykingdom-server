import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POSTGRES_CONNECTION } from '../../app.constants';
import { KinopoiskApiModule } from '../../kinopoisk-api/kinopoisk-api.module';
import { IgdbApiModule } from '../../igdb-api/igdb-api.module';
import { UsersModule } from '../users/users.module';
import { Voting } from './entities/Voting.entity';
import { VotingOption } from './entities/VotingOption.entity';
import { Vote } from './entities/Vote.entity';
import { User } from '../users/entities/User.entity';
import { VotingController } from './voting/voting.controller';
import { VotingOptionsController } from './voting-options/voting-options.controller';
import { VotesController } from './votes/votes.controller';
import { VotingService } from './voting/voting.service';
import { VotingOptionsService } from './voting-options/voting-options.service';
import { VotesService } from './votes/votes.service';

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
  providers: [VotingService, VotingOptionsService, VotesService],
  controllers: [VotingController, VotingOptionsController, VotesController],
})
export class VotesModule {}
