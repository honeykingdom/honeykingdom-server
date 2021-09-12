import { Logger } from '@nestjs/common';
import { Chat, ChatEvents } from 'twitch-js';
import { TwitchChatModuleOptions } from './twitch-chat-options.interface';
import {
  TWITCH_CHAT_CONNECTION,
  TWITCH_CHAT_MODULE,
} from './twitch-chat.constants';

export const getChatModuleToken = (connectionName: string) =>
  `${TWITCH_CHAT_MODULE}${connectionName}`;

export const getChatConnectionToken = (connectionName: string) =>
  `${TWITCH_CHAT_CONNECTION}${connectionName}`;

export const createConnection = async (
  { token, username }: TwitchChatModuleOptions,
  connectionName: string,
) => {
  const chat = new Chat({ log: { level: Infinity }, token, username });
  const logger = new Logger(`TwitchChat: ${connectionName}`);

  chat.on(ChatEvents.CONNECTED, () => logger.log('connected'));
  chat.on(ChatEvents.DISCONNECTED, () => logger.log('disconnected'));

  await chat.connect();

  return chat;
};
