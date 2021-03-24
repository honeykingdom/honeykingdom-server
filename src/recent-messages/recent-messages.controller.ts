import { Controller, Get, Param } from '@nestjs/common';
import { RecentMessagesService } from 'src/recent-messages/recent-messages.service';
import { RecentMessagesResponse } from 'src/recent-messages/recent.messages.interface';

@Controller('api/v1/recent-messages')
export class RecentMessagesController {
  constructor(private recentMessagesService: RecentMessagesService) {}

  @Get(':channel')
  getRecentMessages(@Param('channel') channel: string): RecentMessagesResponse {
    return this.recentMessagesService.getRecentMessages(channel);
  }
}
