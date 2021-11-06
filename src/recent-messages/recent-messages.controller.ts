import { Controller, Get, Param } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { Config } from '../config/config.interface';
import { RecentMessagesService } from '../recent-messages/recent-messages.service';
import { RecentMessagesResponse } from './recent-messages.interface';

@ApiTags('Recent Messages')
@Controller('api/v1/recent-messages')
export class RecentMessagesController {
  private readonly defaultRecentMessagesUrl: string;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
    private readonly recentMessagesService: RecentMessagesService,
  ) {
    this.defaultRecentMessagesUrl = this.configService.get<string>(
      'RECENT_MESSAGES_REDIRECT_URL',
    );
  }

  @Get(':channel')
  @ApiOkResponse({ type: RecentMessagesResponse })
  async getRecentMessages(
    @Param('channel') channel: string,
  ): Promise<RecentMessagesResponse> {
    let recentMessages: RecentMessagesResponse;

    if (this.recentMessagesService.channels.includes(channel)) {
      recentMessages = this.recentMessagesService.getRecentMessages(channel);
    } else {
      const url = this.defaultRecentMessagesUrl.replace('%1', channel);
      const response = await lastValueFrom(this.httpService.get(url));

      recentMessages = response.data;
    }

    return recentMessages;
  }
}
