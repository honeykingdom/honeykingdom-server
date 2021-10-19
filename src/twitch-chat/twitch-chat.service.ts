import { Injectable, Logger } from '@nestjs/common';
import { Chat, ChatEvents, Commands, PrivateMessage } from 'twitch-js';

@Injectable()
export class TwitchChatService {
  private readonly logger: Logger;
  /** Map<channel: string, connections: Set<string>> */
  private readonly channels = new Map<string, Set<string>>();

  constructor(
    private readonly chat: Chat,
    private readonly connectionName: string,
  ) {
    this.logger = new Logger(`TwitchChat: ${connectionName}`);

    // chat.on(Commands.JOIN, ({ channel }) => this.logger.log(`join ${channel}`));
    // chat.on(Commands.PART, ({ channel }) =>
    //   this.logger.log(`part: ${channel}`),
    // );
  }

  joinChannel(channel: string, moduleId: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel).add(moduleId);

    return this.chat.join(channel);
  }

  partChannel(channel: string, moduleId: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel).delete(moduleId);

    if (this.channels.get(channel).size === 0) {
      return this.chat.part(channel);
    }
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
