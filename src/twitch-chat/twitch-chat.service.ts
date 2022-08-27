import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthProvider, RefreshingAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { Repository } from 'typeorm';
import { TwitchChatOptions } from './entities/twitch-chat-options.entity';
import { TwitchChatModuleOptions } from './twitch-chat-options.interface';
import { OnMessage } from './twitch-chat.interface';
import { TWITCH_CHAT_OPTIONS_TOKEN } from './twitch-chat.module-definition';

@Injectable()
export class TwitchChatService implements OnModuleInit {
  private readonly logger: Logger;

  private readonly channels = new Map<string, Set<string>>();

  private readonly chat: ChatClient;

  constructor(
    @Inject(TWITCH_CHAT_OPTIONS_TOKEN) private options: TwitchChatModuleOptions,
    @InjectRepository(TwitchChatOptions)
    private readonly twitchChatOptionsRepo: Repository<TwitchChatOptions>,
  ) {
    const { clientId, clientSecret, tokenData } = options;
    let authProvider: AuthProvider;

    const isAnonymous = !tokenData;

    if (!isAnonymous) {
      authProvider = new RefreshingAuthProvider(
        {
          clientId,
          clientSecret,
          onRefresh: (newTokenData) =>
            this.twitchChatOptionsRepo.update(clientId, {
              tokenData: newTokenData,
            }),
        },
        options.tokenData,
      );
    }

    this.logger = new Logger(
      `TwitchChat: ${isAnonymous ? 'Anonymous' : 'Main'}`,
    );

    this.chat = new ChatClient({ authProvider });

    // this.chat.onAnyMessage((msg) => console.log((msg as any)._raw));
    this.chat.onJoin((channel) => this.logger.log(`JOIN ${channel}`));
    this.chat.onPart((channel) => this.logger.log(`PART ${channel}`));

    this.on('register', () => {
      [...this.channels.keys()].forEach((channel) => {
        this.chat
          .join(channel)
          .catch((e) => this.logger.error(`JOIN ${channel} ${e}`));
      });
    });
  }

  async onModuleInit() {
    await this.chat.connect().catch((e) => this.logger.error(e));
    this.logger.log('connected');
  }

  join(channel: string, moduleId: string) {
    this.initChannel(channel);
    this.channels.get(channel).add(moduleId);
    if (!this.chat?.isRegistered) return;
    return this.chat
      .join(channel)
      .catch((e) => this.logger.error(`JOIN ${channel} ${e}`));
  }

  part(channel: string, moduleId: string) {
    this.initChannel(channel);
    this.channels.get(channel).delete(moduleId);
    if (!this.chat?.isRegistered) return;
    if (this.channels.get(channel).size === 0) return this.chat.part(channel);
  }

  private initChannel(channel: string) {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
  }

  say(channel: string, message: string) {
    return this.chat
      .say(channel, message)
      .catch((e) => this.logger.error(`SAY ${channel} ${e}`));
  }

  on(event: 'message', listener: OnMessage);
  on(event: 'connect', listener: () => void);
  on(event: 'register', listener: () => void);
  on(event: any, listener: any) {
    this.chat.addListener(this.getEvent(event), listener);
  }

  off(event: 'message', listener: OnMessage);
  off(event: 'connect', listener: () => void);
  off(event: 'register', listener: () => void);
  off(event: any, listener: any) {
    this.chat.removeListener(this.getEvent(event), listener);
  }

  once(event: 'message', listener: OnMessage);
  once(event: 'connect', listener: () => void);
  once(event: 'register', listener: () => void);
  once(event: any, listener: any) {
    const fn = (...args: any) => {
      this.chat.removeListener(this.getEvent(event), fn);
      listener(args);
    };
    this.chat.addListener(this.getEvent(event), fn);
  }

  private getEvent(event: string): any {
    const events = {
      message: this.chat.onMessage,
      connect: this.chat.onConnect,
      register: this.chat.onRegister,
    };
    return events[event];
  }
}
