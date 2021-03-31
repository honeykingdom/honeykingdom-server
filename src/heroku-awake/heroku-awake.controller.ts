import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class HerokuAwakeController {
  constructor() {}

  @Get('ping')
  ping() {
    return 'pong';
  }
}
