import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpRequestModule } from 'src/http-request/http-request.module';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { TelegramApiService } from './telegram-api.service';

@Module({
  imports: [
    ConfigModule,
    HttpRequestModule,
    TypeOrmModule.forFeature([TelegramChannel]),
  ],
  providers: [TelegramApiService],
  controllers: [],
  exports: [TelegramApiService],
})
export class TelegramApiModule {}
