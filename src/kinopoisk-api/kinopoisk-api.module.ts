import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KinopoiskApiService } from './kinopoisk-api.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [KinopoiskApiService],
  exports: [KinopoiskApiService],
})
export class KinopoiskApiModule {}
