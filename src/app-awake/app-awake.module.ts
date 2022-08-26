import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AppAwakeController } from './app-awake.controller';
import { AppAwakeService } from './app-awake.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [AppAwakeService],
  controllers: [AppAwakeController],
})
export class AppAwakeModule {}
