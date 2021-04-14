import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter } from 'events';
import { Config } from 'src/config/config.interface';
import { HttpRequestService } from 'src/http-request/http-request.service';
import { Repository } from 'typeorm';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { TelegramPost } from './telegram-api.interface';
import parseTelegramPost from './utils/parseTelegramPost';

export interface TelegramApiService {
  on(event: 'post', listener: (post: TelegramPost) => void): this;
}

@Injectable()
export class TelegramApiService extends EventEmitter {
  private readonly checkInterval: number;
  private readonly softCheckCount = 2;
  private readonly hardCheckCount = 10;
  private readonly hardCheckEveryIterations = 20;
  private iterations = 0;

  private readonly channels: Set<string> = new Set();
  private readonly lastPostIds: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpRequestService: HttpRequestService,
    @InjectRepository(TelegramChannel)
    private readonly telegramChannelRepository: Repository<TelegramChannel>,
  ) {
    super();

    this.checkInterval = Number.parseInt(
      this.configService.get<string>('TELEGRAM_API_CHECK_INTERVAL'),
    );

    setInterval(() => this.checkChannels(), this.checkInterval);
  }

  async addChannel(channel: string) {
    const lastPostId = await this.getLastPostId(channel);

    this.channels.add(channel);
    this.lastPostIds.set(channel, lastPostId);
  }

  removeChannel(channel: string) {
    this.channels.delete(channel);
    this.lastPostIds.delete(channel);
  }

  private async getLastPostId(channel: string) {
    const telegramChannel = await this.telegramChannelRepository.findOne({
      where: { _id: channel },
    });

    return telegramChannel?.lastPostId || 1;
  }

  private setLastPostId(channel: string, lastPostId: number) {
    this.lastPostIds.set(channel, lastPostId);

    return this.telegramChannelRepository.save({ _id: channel, lastPostId });
  }

  private checkChannels() {
    this.channels.forEach((channel) => {
      this.iterations += 1;
      this.checkChannelPosts(channel);
    });
  }

  private async checkChannelPosts(channel: string) {
    const checkPostsCount =
      this.iterations % this.hardCheckEveryIterations === 0
        ? this.hardCheckCount
        : this.softCheckCount;

    let postId = this.lastPostIds.get(channel);

    for (let i = 1; i <= checkPostsCount; ) {
      postId += 1;

      const { type, post } = await this.getPost(channel, postId);

      if (type === 'post') {
        this.emit('post', post);

        const diff = post.media.length === 0 ? 0 : post.media.length - 1;

        postId += diff;

        await this.setLastPostId(channel, postId);
      }

      if (type === 'not-found' || type === 'service-message') {
        i += 1;
      }
    }
  }

  private async getPost(channel: string, postId: number) {
    const html = await this.httpRequestService.get(
      `https://t.me/${channel}/${postId}?embed=1`,
      {},
      'text',
    );

    return parseTelegramPost(html);
  }
}
