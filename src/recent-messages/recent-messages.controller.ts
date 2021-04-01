import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Config } from 'src/config/config.interface';
import { RecentMessagesService } from 'src/recent-messages/recent-messages.service';
import { RecentMessagesResponse } from 'src/recent-messages/recent.messages.interface';

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
  getRecentMessages(
    @Res() res: Response,
    @Param('channel') channel: string,
  ): RecentMessagesResponse {
    if (!this.recentMessagesService.channels.includes(channel)) {
      const url = this.defaultRecentMessagesUrl.replace('%1', channel);

      res.redirect(HttpStatus.MOVED_PERMANENTLY, url);

      return;
    }

    res.send(this.recentMessagesService.getRecentMessages(channel));
  }
}
