import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HerokuAwakeController } from './heroku-awake.controller';
import { HerokuAwakeService } from './heroku-awake.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [HerokuAwakeService],
  controllers: [HerokuAwakeController],
})
export class HerokuAwakeModule {}
