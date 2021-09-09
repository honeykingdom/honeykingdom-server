import { Inject } from '@nestjs/common';
import { getChatModuleToken } from './twitch-chat.utils';

export const InjectChat = (connectionName: string) =>
  Inject(getChatModuleToken(connectionName));
