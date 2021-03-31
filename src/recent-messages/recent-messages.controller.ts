import { Controller, Get, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Config } from 'src/config/config.interface';
import { RecentMessagesService } from 'src/recent-messages/recent-messages.service';
import { RecentMessagesResponse } from 'src/recent-messages/recent.messages.interface';

@Controller('api/v1/recent-messages')
export class RecentMessagesController {
  private readonly channels: string[];

  constructor(
    private readonly configService: ConfigService<Config>,
    private recentMessagesService: RecentMessagesService,
  ) {
    this.channels = this.configService
      .get<string>('TWITCH_CHANNELS')
      .split(';');
  }

  @Get(':channel')
  getRecentMessages(
    @Res() res: Response,
    @Param('channel') channel: string,
  ): RecentMessagesResponse {
    if (!this.channels.includes(channel)) {
      const defaultRecentMessagesUrl = this.configService.get<string>(
        'DEFAULT_RECENT_MESSAGES_URL',
        '',
      );
      const url = defaultRecentMessagesUrl.replace('%1', channel);

      res.redirect(url);

      return;
    }

    res.send(this.recentMessagesService.getRecentMessages(channel));
  }
}
