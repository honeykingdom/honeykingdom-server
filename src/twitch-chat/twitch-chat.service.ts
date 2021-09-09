import { Injectable, Logger } from '@nestjs/common';
import { Chat, ChatEvents, Commands, PrivateMessage } from 'twitch-js';

@Injectable()
export class TwitchChatService {
  logger: Logger;

  constructor(
    private readonly chat: Chat,
    private readonly connectionName: string,
  ) {
    this.logger = new Logger(`TwitchChatService: ${connectionName}`);

    this.chat.on(ChatEvents.CONNECTED, () => this.logger.log(`connected`));
    this.chat.on(ChatEvents.DISCONNECTED, () =>
      this.logger.log('disconnected'),
    );

    this.chat.on(Commands.JOIN, ({ channel }) =>
      this.logger.log(`join ${channel}`),
    );

    this.chat.on(Commands.PART, ({ channel }) =>
      this.logger.log(`part: ${channel}`),
    );
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
