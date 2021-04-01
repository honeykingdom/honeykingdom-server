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

  public readonly channels: string[];

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(Message)
    private readonly recentMessagesRepository: Repository<Message>,
    private readonly twitchChatService: TwitchChatService,
  ) {
    this.messagesLimit = Number.parseInt(
      this.configService.get<string>('RECENT_MESSAGES_LIMIT'),
    );

    this.channels = this.configService
      .get<string>('RECENT_MESSAGES_CHANNELS')
      .split(';');

    Promise.all(
      this.channels.map((channel) => twitchChatService.joinChannel(channel)),
    );

    Promise.all(
      this.channels.map((channel) =>
        this.recentMessagesRepository.find({
          where: { channel },
          take: this.messagesLimit,
          order: { timestamp: 'DESC' },
        }),
      ),
    ).then((allRecentMessages) => {
      allRecentMessages.forEach((recentMessages, i) => {
        const channel = this.channels[i];

        this.recentMessages[channel] = recentMessages
          .reverse()
          .map((message) => message.raw);
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

    if (process.env.NODE_ENV === 'production') {
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
  }

  getRecentMessages(channel: string): RecentMessagesResponse {
    return {
      messages: this.recentMessages[channel] ?? [],
    };
  }
}
