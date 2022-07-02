import { CacheModule, Module } from '@nestjs/common';
import { IgdbApiModule } from '../../igdb-api/igdb-api.module';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';

@Module({
  imports: [
    IgdbApiModule,
    CacheModule.register({
      ttl: 86400, // 1 day
      max: 100,
    }),
  ],
  providers: [GamesService],
  controllers: [GamesController],
})
export class GamesModule {}
