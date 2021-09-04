import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { Config } from '../config/config.interface';
import { RecentMessagesService } from '../recent-messages/recent-messages.service';
import { RecentMessagesResponse } from '../recent-messages/recent.messages.interface';

@Controller('api/v1/recent-messages')
export class RecentMessagesController {
  private readonly defaultRecentMessagesUrl: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly recentMessagesService: RecentMessagesService,
  ) {
    this.defaultRecentMessagesUrl = this.configService.get<string>(
      'RECENT_MESSAGES_REDIRECT_URL',
    );
  }

  @Get(':channel')
  async getRecentMessages(
    @Param('channel') channel: string,
  ): Promise<RecentMessagesResponse> {
    let recentMessages: RecentMessagesResponse;

    if (this.recentMessagesService.channels.includes(channel)) {
      recentMessages = this.recentMessagesService.getRecentMessages(channel);
    } else {
      const url = this.defaultRecentMessagesUrl.replace('%1', channel);
      const response = await fetch(url);

      recentMessages = await response.json();
    }

    return recentMessages;
  }
}
