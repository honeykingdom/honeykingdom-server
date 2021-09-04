import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivateMessage } from 'twitch-js';
import { Config } from '../config/config.interface';
import { TwitchChatService } from '../twitch-chat/twitch-chat.service';
import { Message } from '../recent-messages/entities/message.entity';
import { RecentMessagesResponse } from '../recent-messages/recent.messages.interface';

@Injectable()
export class RecentMessagesService {
  private readonly messagesLimit: number;
  private readonly recentMessages: Map<string, string[]> = new Map();

  public readonly channels: string[];

  constructor(
    private readonly configService: ConfigService<Config>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
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
        this.messageRepository.find({
          where: { channel },
          take: this.messagesLimit,
          order: { timestamp: 'DESC' },
        }),
      ),
    ).then((allRecentMessages) => {
      allRecentMessages.forEach((channelRecentMessages, i) =>
        this.recentMessages.set(
          this.channels[i],
          channelRecentMessages.reverse().map((message) => message.raw),
        ),
      );
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

    if (!this.channels.includes(channel)) return;

    if (!this.recentMessages.get(channel)) {
      this.recentMessages.set(channel, []);
    }

    const channelRecentMessages = this.recentMessages.get(channel);

    if (channelRecentMessages.length >= this.messagesLimit) {
      channelRecentMessages.shift();
    }

    channelRecentMessages.push(_raw);

    if (process.env.NODE_ENV === 'production') {
      this.messageRepository
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
      messages: this.recentMessages.get(channel) ?? [],
    };
  }
}
