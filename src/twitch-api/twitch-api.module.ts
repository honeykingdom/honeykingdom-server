import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TwitchApiService } from './twitch-api.service';

@Module({
  imports: [HttpModule],
  providers: [TwitchApiService],
  exports: [TwitchApiService],
})
export class TwitchApiModule {}
