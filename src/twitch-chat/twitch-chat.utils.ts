import { Chat } from 'twitch-js';
import { TwitchChatModuleOptions } from './twitch-chat-options.interface';
import {
  TWITCH_CHAT_CONNECTION,
  TWITCH_CHAT_MODULE,
} from './twitch-chat.constants';

export const getChatModuleToken = (connectionName: string) =>
  `${TWITCH_CHAT_MODULE}${connectionName}`;

export const getChatConnectionToken = (connectionName: string) =>
  `${TWITCH_CHAT_CONNECTION}${connectionName}`;

export const createConnection = async ({
  token,
  username,
}: TwitchChatModuleOptions) => {
  const chat = new Chat({ log: { level: Infinity }, token, username });

  await chat.connect();

  return chat;
};
