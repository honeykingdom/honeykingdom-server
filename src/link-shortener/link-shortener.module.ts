import { DynamicModule, Module } from '@nestjs/common';
import { LinkShortenerService } from './link-shortener.service';

@Module({
  imports: [],
  providers: [LinkShortenerService],
  controllers: [],
  exports: [LinkShortenerService],
})
export class LinkShortenerModule {}
