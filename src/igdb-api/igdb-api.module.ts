import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IgdbApiService } from './igdb-api.service';
import { IgdbApiOptions } from './entities/igdb-api-options.entity';
import { IgdbRequestService } from './igdb-request.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([IgdbApiOptions]),
  ],
  providers: [IgdbApiService, IgdbRequestService],
  exports: [IgdbApiService],
})
export class IgdbApiModule {}
