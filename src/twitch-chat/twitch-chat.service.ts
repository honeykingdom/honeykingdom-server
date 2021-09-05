import { Injectable, Scope } from '@nestjs/common';
import { Chat, ChatEvents, Commands, PrivateMessage } from 'twitch-js';
import { TwitchChatModuleOptions } from './twitch-chat-options.interface';

@Injectable({ scope: Scope.TRANSIENT })
export class TwitchChatService {
  private readonly chat: Chat;

  constructor(options: TwitchChatModuleOptions) {
    this.chat = new Chat({ log: { level: Infinity }, ...options });

    this.chat.on(ChatEvents.CONNECTED, () => console.log('connected'));
    this.chat.on(ChatEvents.DISCONNECTED, () => console.log('disconnected'));

    this.chat.on(Commands.JOIN, ({ channel }) =>
      console.log(`join: ${channel}`),
    );
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

  say(channel: string, message: string) {
    this.chat.say(channel, message);
  }

  addChatListener(listener: (message: PrivateMessage) => void) {
    this.chat.on(Commands.PRIVATE_MESSAGE, listener);
  }

  removeChatListener(listener: (message: PrivateMessage) => void) {
    this.chat.off(Commands.PRIVATE_MESSAGE, listener);
  }
}
