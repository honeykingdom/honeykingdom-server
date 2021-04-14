import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LinkShortenerService } from './link-shortener.service';

@Module({
  imports: [ConfigModule],
  providers: [LinkShortenerService],
  controllers: [],
  exports: [LinkShortenerService],
})
export class LinkShortenerModule {}
