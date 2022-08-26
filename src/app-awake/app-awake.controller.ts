import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('App Awake')
@Controller('api')
export class AppAwakeController {
  @Get('ping')
  ping() {
    return 'pong';
  }
}
