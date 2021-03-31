import { Module } from '@nestjs/common';
import { HerokuAwakeController } from './heroku-awake.controller';
import { HerokuAwakeService } from './heroku-awake.service';

@Module({
  imports: [],
  providers: [HerokuAwakeService],
  controllers: [HerokuAwakeController],
})
export class HerokuAwakeModule {}
