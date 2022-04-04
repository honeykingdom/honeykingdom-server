import { CacheModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({ ttl: InstagramService.CACHE_TTL }),
  ],
  providers: [InstagramService],
  controllers: [InstagramController],
})
export class InstagramModule {}
