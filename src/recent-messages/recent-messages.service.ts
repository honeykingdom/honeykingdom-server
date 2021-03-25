import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivateMessage } from 'twitch-js';
import { Config } from 'src/config/config.interface';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';
import { Message } from 'src/recent-messages/entities/message.entity';
import { RecentMessagesResponse } from 'src/recent-messages/recent.messages.interface';

@Injectable()
export class RecentMessagesService {
  private readonly messagesLimit: number;
  private readonly recentMessages: Record<string, string[]> = {};

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(Message)
    private readonly recentMessagesRepository: Repository<Message>,
    private readonly twitchChatService: TwitchChatService,
  ) {
    this.messagesLimit = Number.parseInt(
      this.configService.get<string>('MESSAGES_LIMIT'),
    );

    const channels = this.configService
      .get<string>('TWITCH_CHANNELS')
      .split(';');

    Promise.all(
      channels.map((channel) => twitchChatService.joinChannel(channel)),
    );

    Promise.all(
      channels.map((channel) =>
        this.recentMessagesRepository.find({
          where: { channel },
          take: this.messagesLimit,
          order: { timestamp: 'ASC' },
        }),
      ),
    ).then((allRecentMessages) => {
      allRecentMessages.forEach((recentMessages, i) => {
        const channel = channels[i];

        this.recentMessages[channel] = recentMessages.map(
          (message) => message.raw,
        );
      });
    });

    this.twitchChatService.addChatListener((message) =>
      this.handleChatMessage(message),
    );
  }

  handleChatMessage(privateMessage: PrivateMessage) {
    const {
      _raw,
      channel: channelRaw,
      message,
      username,
      timestamp,
    } = privateMessage;

    const channel = channelRaw.slice(1);

    if (this.recentMessages[channel].length >= this.messagesLimit) {
      this.recentMessages[channel].shift();
    }

    this.recentMessages[channel].push(_raw);

    this.recentMessagesRepository
      .insert({
        raw: _raw,
        channel,
        message,
        username,
        timestamp,
      })
      .catch((e) => console.log(e));
  }

  getRecentMessages(channel: string): RecentMessagesResponse {
    return {
      messages: this.recentMessages[channel] ?? [],
    };
  }
}
