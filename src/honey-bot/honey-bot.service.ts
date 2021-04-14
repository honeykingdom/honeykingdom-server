import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config/config.interface';
import { LinkShortenerService } from 'src/link-shortener/link-shortener.service';
import { TelegramPost } from 'src/telegram-api/telegram-api.interface';
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
    private readonly linkShortenerService: LinkShortenerService,
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

    this.telegramApiService.on('post', async (post) => {
      if (!telegramChannels.includes(post.channel.name)) return;

      const message = await this.formatTelegramMessage(post);

      this.messagesQueue.push({ channel, message });
    });
  }

  private sendMessageInQueue() {
    const queuedMessage = this.messagesQueue.shift();

    if (!queuedMessage) return;

    const { channel, message } = queuedMessage;

    this.twitchChatService.say(channel, message);
  }

  private async formatTelegramMessage(post: TelegramPost) {
    const shortLinks = await Promise.all(
      post.media
        .filter((p) => p.url)
        .map(({ url }) => this.linkShortenerService.shorten(url)),
    );

    const links = shortLinks.filter(Boolean).join(' ');
    const maxTextLength = links.length ? 500 - links.length + 1 : 500;
    const text = `${post.channel.title}: ${post.bodyText}`
      .trim()
      .slice(0, maxTextLength);

    const message = `${text} ${links}`.trim();

    return message;
  }
}
