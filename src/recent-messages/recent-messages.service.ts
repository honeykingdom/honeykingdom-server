import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MONGODB_CONNECTION } from '../app.constants';
import { Config } from '../config/config.interface';
import { TwitchChatService } from '../twitch-chat/twitch-chat.service';
import { Message } from '../recent-messages/entities/message.entity';
import { RecentMessagesResponse } from './recent-messages.interface';
import { OnMessage } from '../twitch-chat/twitch-chat.interface';

@Injectable()
export class RecentMessagesService {
  private readonly logger = new Logger(RecentMessagesService.name);
  private readonly messagesLimit: number;
  private readonly recentMessages: Map<string, string[]> = new Map();

  public readonly channels: string[];

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly twitchChat: TwitchChatService,
    @InjectRepository(Message, MONGODB_CONNECTION)
    private readonly messageRepository: Repository<Message>,
  ) {
    this.messagesLimit = Number.parseInt(
      this.configService.get<string>('RECENT_MESSAGES_LIMIT'),
    );

    this.channels = this.configService
      .get<string>('RECENT_MESSAGES_CHANNELS')
      .split(';');

    this.logger.log(
      `[Options] messagesLimit: ${
        this.messagesLimit
      }, channels: ${this.channels.join(', ')}`,
    );

    this.channels.map((channel) =>
      twitchChat.join(channel, RecentMessagesService.name),
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

    this.twitchChat.on('message', (...args) => this.handleMessage(...args));
  }

  handleMessage: OnMessage = (channelRaw, username, message, msg) => {
    const channel = channelRaw.slice(1);

    if (!this.channels.includes(channel)) return;
    if (!this.recentMessages.get(channel)) this.recentMessages.set(channel, []);

    const channelRecentMessages = this.recentMessages.get(channel);

    if (channelRecentMessages.length >= this.messagesLimit) {
      channelRecentMessages.shift();
    }

    const raw = (msg as any)._raw;
    const timestamp = msg.date;

    channelRecentMessages.push(raw);

    if (process.env.NODE_ENV === 'production') {
      this.messageRepository
        .insert({
          raw,
          channel,
          message,
          username,
          timestamp,
        })
        .catch((e) => console.log(e));
    }
  };

  getRecentMessages(channel: string): RecentMessagesResponse {
    return {
      messages: this.recentMessages.get(channel) ?? [],
    };
  }
}
