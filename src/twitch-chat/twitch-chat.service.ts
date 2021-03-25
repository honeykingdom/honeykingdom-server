import { Injectable, Scope } from '@nestjs/common';
import { Chat, ChatEvents, PrivateMessage } from 'twitch-js';
import { TwitchChatOptions } from './twitch-chat.types';

@Injectable({ scope: Scope.TRANSIENT })
export class TwitchChatService {
  private readonly chat: Chat;

  constructor(options: TwitchChatOptions) {
    this.chat = new Chat({ log: { level: Infinity }, ...options });

    this.chat.on(ChatEvents.CONNECTED, () => console.log('connected'));
    this.chat.on(ChatEvents.DISCONNECTED, () => console.log('disconnected'));
  }

  connect() {
    return this.chat.connect();
  }

  joinChannel(channel: string) {
    return this.chat.join(channel);
  }

  partChannel(channel: string) {
    return this.chat.part(channel);
  }

  addChatListener(listener: (message: PrivateMessage) => void) {
    this.chat.on('PRIVMSG', listener);
  }

  removeChatListener(listener: (message: PrivateMessage) => void) {
    this.chat.off('PRIVMSG', listener);
  }
}
