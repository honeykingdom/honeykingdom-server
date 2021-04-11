import { Module } from '@nestjs/common';
import { HttpRequestService } from './http-request.service';

@Module({
  imports: [],
  providers: [HttpRequestService],
  controllers: [],
  exports: [HttpRequestService],
})
export class HttpRequestModule {}
