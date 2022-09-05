import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import CustomLogger from './custom-logger';
import LogsService from './logs.service';

@Module({
  imports: [ConfigModule],
  providers: [CustomLogger, LogsService],
  exports: [CustomLogger],
})
export class CustomLoggerModule {}
