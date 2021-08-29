import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IgdbApiService } from './igdb-api.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [IgdbApiService],
  exports: [IgdbApiService],
})
export class IgdbApiModule {}
