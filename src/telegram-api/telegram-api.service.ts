import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { EventEmitter } from 'events';
import ms from 'ms';
import { POSTGRES_CONNECTION } from '../app.constants';
import { Config } from '../config/config.interface';
import parseTelegramPost from './utils/parseTelegramPost';
import { TelegramChannel } from './entities/telegram-channel.entity';
import { TelegramPost } from './telegram-api.interface';

export interface TelegramApiService {
  on(event: 'post', listener: (post: TelegramPost) => void): this;
}

// TODO: repost with images and text https://t.me/etozhemad/11531
@Injectable()
export class TelegramApiService extends EventEmitter {
  private readonly checkInterval: number;
  private readonly softCheckCount = 2;
  private readonly hardCheckCount = 10;
  private readonly hardCheckEveryIterations = 60;
  private iterations = 0;

  private readonly channelNames: Set<string> = new Set();
  private readonly lastPostIds: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly httpService: HttpService,
    @InjectRepository(TelegramChannel, POSTGRES_CONNECTION)
    private readonly telegramChannelRepo: Repository<TelegramChannel>,
  ) {
    super();

    const checkInterval = this.configService.get(
      'TELEGRAM_API_CHECK_INTERVAL',
      { infer: true },
    );

    this.checkInterval = ms(checkInterval);

    setInterval(() => this.checkChannels(), this.checkInterval);
  }

  async addChannel(channelName: string) {
    const lastPostId = await this.getLastPostId(channelName);

    this.channelNames.add(channelName);
    this.lastPostIds.set(channelName, lastPostId);
  }

  removeChannel(channelName: string) {
    this.channelNames.delete(channelName);
    this.lastPostIds.delete(channelName);
  }

  private async getLastPostId(channelName: string) {
    const telegramChannel = await this.telegramChannelRepo.findOne({
      where: { channelName },
    });

    return telegramChannel?.lastPostId || 1;
  }

  private setLastPostId(channelName: string, lastPostId: number) {
    this.lastPostIds.set(channelName, lastPostId);

    return this.telegramChannelRepo.save({ channelName, lastPostId });
  }

  private checkChannels() {
    this.channelNames.forEach((channelName) => {
      this.iterations += 1;
      this.checkChannelPosts(channelName);
    });
  }

  private async checkChannelPosts(channelName: string) {
    const checkPostsCount =
      this.iterations % this.hardCheckEveryIterations === 0
        ? this.hardCheckCount
        : this.softCheckCount;

    let postId = this.lastPostIds.get(channelName);

    for (let i = 1; i <= checkPostsCount; ) {
      postId += 1;

      const { type, post } = await this.getPost(channelName, postId);

      if (type === 'post') {
        this.emit('post', post);

        const diff = post.media.length === 0 ? 0 : post.media.length - 1;

        postId += diff;

        await this.setLastPostId(channelName, postId);
      }

      if (type === 'not-found' || type === 'service-message') {
        i += 1;
      }
    }
  }

  private async getPost(channelName: string, postId: number) {
    const response = await lastValueFrom(
      this.httpService.get<string>(
        `https://t.me/${channelName}/${postId}?embed=1`,
      ),
    );

    return parseTelegramPost(response.data);
  }
}
