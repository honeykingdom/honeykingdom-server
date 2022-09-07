import { CacheModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { Config } from '../config/config.interface';
import { AppAwakeController } from './app-awake.controller';
import { AppAwakeService } from './app-awake.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    CacheModule.registerAsync<ClientOpts>({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<Config>) => ({
        store: redisStore,
        ttl: 0,
        url: configService.get('REDIS_URL', { infer: true }),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AppAwakeService],
  controllers: [AppAwakeController],
})
export class AppAwakeModule {}
