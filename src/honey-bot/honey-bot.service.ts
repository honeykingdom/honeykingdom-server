import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.interface';
import { TelegramApiService } from 'src/telegram-api/telegram-api.service';
import { TwitchChatService } from 'src/twitch-chat/twitch-chat.service';

type QueuedMessage = {
  channel: string;
  message: string;
};

@Injectable()
export class HoneyBotService {
  private readonly channels: Set<string> = new Set();
  private readonly telegramChannels: Map<string, string[]> = new Map();

  private readonly sendMessageInterval = 5 * 1000; // 5 sec
  private readonly messagesQueue: QueuedMessage[] = [];

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly twitchChatService: TwitchChatService,
    private readonly telegramApiService: TelegramApiService,
  ) {
    this.configService
      .get('HONEY_BOT_CHANNELS')
      .split(';')
      .forEach((channel) => this.channels.add(channel));

    const telegramToChat = JSON.parse(
      this.configService.get('HONEY_BOT_TELEGRAM_TO_CHAT'),
    ) as Record<string, string[]>;

    Object.entries(telegramToChat).forEach(([channel, telegramChannels]) =>
      this.telegramChannels.set(channel, telegramChannels),
    );

    this.channels.forEach((channel) => this.watchChannel(channel));

    setInterval(() => {
      this.sendMessageInQueue();
    }, this.sendMessageInterval);
  }

  private watchChannel(channel: string) {
    this.twitchChatService.joinChannel(channel);

    const telegramChannels = this.telegramChannels.get(channel) || [];

    telegramChannels.forEach((telegramChannel) =>
      this.telegramApiService.addChannel(telegramChannel),
    );

    this.telegramApiService.on('post', (post) => {
      if (!telegramChannels.includes(post.channel.name)) return;

      const message = `${post.channel.title}: ${post.bodyText}`.slice(0, 500);

      this.messagesQueue.push({ channel, message });
    });
  }

  private sendMessageInQueue() {
    const queuedMessage = this.messagesQueue.shift();

    if (!queuedMessage) return;

    const { channel, message } = queuedMessage;

    this.twitchChatService.say(channel, message);
  }
}
