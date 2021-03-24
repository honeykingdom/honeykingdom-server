import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chat, ChatEvents, PrivateMessage } from 'twitch-js';
import { Config } from 'src/config/config.interface';

@Injectable()
export class TwitchChatService {
  private readonly chat: Chat;

  constructor(private readonly configService: ConfigService<Config>) {
    const channels = this.configService
      .get<string>('TWITCH_CHANNELS')
      .split(';');

    this.chat = new Chat({ log: { level: Infinity } });

    this.chat.connect().then(() => {
      console.log('connected');
      channels.forEach((channel) => this.chat.join(channel));
    });

    this.chat.on(ChatEvents.CONNECTED, () => console.log('connected'));
    this.chat.on(ChatEvents.DISCONNECTED, () => console.log('disconnected'));
  }

  addChatListener(listener: (message: PrivateMessage) => void) {
    this.chat.on('PRIVMSG', listener);
  }

  removeChatListener(listener: (message: PrivateMessage) => void) {
    this.chat.off('PRIVMSG', listener);
  }
}
