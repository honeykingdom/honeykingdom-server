import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Heroku Awake')
@Controller('api')
export class HerokuAwakeController {
  @Get('ping')
  ping() {
    return 'pong';
  }
}
