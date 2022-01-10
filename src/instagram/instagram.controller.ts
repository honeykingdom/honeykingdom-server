import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InstagramService } from './instagram.service';

@ApiTags('Instagram')
@Controller('api/instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('/:nickname/last-post-url')
  @ApiOkResponse({ type: String })
  getLastPostUrl(@Param('nickname') nickname: string): Promise<string> {
    return this.instagramService.getLastPostUrl(nickname);
  }
}
