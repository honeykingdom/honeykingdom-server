import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { TelegramApiService } from './telegram-api.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([TelegramChannel]),
  ],
  providers: [TelegramApiService],
  controllers: [],
  exports: [TelegramApiService],
})
export class TelegramApiModule {}
