import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { PrivateMessage, UserNotice } from '@twurple/chat';
import { MYSQL_CONNECTION } from '../app.constants';
import { Config } from '../config/config.interface';
import { TwitchChatService } from '../twitch-chat/twitch-chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { RecentMessagesResponse } from './recent-messages.interface';

@Injectable()
export class RecentMessagesService {
  private readonly logger = new Logger(RecentMessagesService.name);
  private readonly messagesLimit: number;
  private readonly recentMessages: Map<string, string[]> = new Map();

  public readonly channels: string[];

  private queue: ChatMessage[] = [];
  private isPending = false;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly twitchChat: TwitchChatService,
    @InjectRepository(ChatMessage, MYSQL_CONNECTION)
    private readonly chatMessageRepo: Repository<ChatMessage>,
  ) {
    this.messagesLimit = Number.parseInt(
      this.configService.get<string>('RECENT_MESSAGES_LIMIT'),
    );

    this.channels = this.configService
      .get<string>('RECENT_MESSAGES_CHANNELS')
      .split(';');

    this.logger.log(`Channels: ${this.channels.join(', ')}`);

    this.channels.map(async (channel) => {
      try {
        await twitchChat.join(channel, RecentMessagesService.name);
      } catch (e) {}
    });

    // TODO: make one request to fetch messages for all channels
    Promise.all(
      this.channels.map((channelName) =>
        this.chatMessageRepo.find({
          where: { channelName },
          take: this.messagesLimit,
          order: { createdAt: 'DESC' },
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

    this.twitchChat.on('message', (ch, u, m, msg) => this.handleMessage(msg));
    this.twitchChat.on('action', (ch, u, m, msg) => this.handleMessage(msg));
    this.twitchChat.on('userNotice', (msg) => this.handleMessage(msg));
  }

  handleMessage = (msg: PrivateMessage | UserNotice) => {
    const channelName = (msg as any)._params[0].value.slice(1);

    if (!this.channels.includes(channelName)) return;
    if (!this.recentMessages.get(channelName)) {
      this.recentMessages.set(channelName, []);
    }

    const channelRecentMessages = this.recentMessages.get(channelName);

    if (channelRecentMessages.length >= this.messagesLimit) {
      channelRecentMessages.shift();
    }

    const tags = msg.tags;
    const raw = (msg as any)._raw;

    let message = '';
    let userName = '';

    if ((msg as any)._command === 'PRIVMSG') {
      message = (msg as PrivateMessage).content?.value;
      userName = (msg as any)._prefix?.nick || '';
    }

    if ((msg as any)._command === 'USERNOTICE') {
      message =
        (msg as UserNotice).message?.value ||
        tags.get('system-msg')?.replace(/\\s/g, ' ') ||
        '';
      userName = tags.get('login') || '';
    }

    channelRecentMessages.push(raw);

    this.queue.push({
      id: tags.get('id'),
      channelId: Number.parseInt(tags.get('room-id')),
      channelName,
      userId: Number.parseInt(tags.get('user-id')),
      userName,
      message,
      raw,
      createdAt: new Date(Number.parseInt(tags.get('tmi-sent-ts'))),
    });
  };

  getRecentMessages(channel: string): RecentMessagesResponse {
    return {
      messages: this.recentMessages.get(channel) ?? [],
    };
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async storeMessages() {
    if (
      process.env.NODE_ENV !== 'production' ||
      this.isPending ||
      this.queue.length === 0
    ) {
      return;
    }

    this.isPending = true;

    try {
      const messages = this.queue;
      this.queue = [];
      await this.chatMessageRepo.insert(messages);
    } catch (e) {
      this.logger.error(e.code);
    }

    this.isPending = false;
  }
}
