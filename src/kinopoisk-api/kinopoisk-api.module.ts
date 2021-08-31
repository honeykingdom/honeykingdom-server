import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { KinopoiskApiService } from './kinopoisk-api.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [KinopoiskApiService],
  exports: [KinopoiskApiService],
})
export class KinopoiskApiModule {}
