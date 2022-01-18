import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KinopoiskApiModule } from '../../kinopoisk-api/kinopoisk-api.module';
import { IgdbApiModule } from '../../igdb-api/igdb-api.module';
import { UsersModule } from '../users/users.module';
import { Voting } from './entities/voting.entity';
import { VotingOption } from './entities/voting-option.entity';
import { Vote } from './entities/vote.entity';
import { User } from '../users/entities/user.entity';
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
    TypeOrmModule.forFeature([User, Voting, VotingOption, Vote]),
  ],
  providers: [VotingService, VotingOptionsService, VotesService],
  controllers: [VotingController, VotingOptionsController, VotesController],
})
export class VotesModule {}
