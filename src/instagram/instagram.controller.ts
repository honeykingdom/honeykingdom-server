import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InstagramService } from './instagram.service';

@ApiTags('Instagram')
@Controller('api/instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('/last-post-id/:nickname')
  @ApiOkResponse({ type: String })
  @ApiNotFoundResponse({ description: 'Not found' })
  getLastPostId(@Param('nickname') nickname: string): Promise<string> {
    return this.instagramService.getLastPostId(nickname);
  }
}
