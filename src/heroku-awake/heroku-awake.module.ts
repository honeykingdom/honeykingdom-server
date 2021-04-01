import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HerokuAwakeController } from './heroku-awake.controller';
import { HerokuAwakeService } from './heroku-awake.service';

@Module({
  imports: [ConfigModule],
  providers: [HerokuAwakeService],
  controllers: [HerokuAwakeController],
})
export class HerokuAwakeModule {}
