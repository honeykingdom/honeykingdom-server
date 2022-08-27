import { ConfigurableModuleBuilder } from '@nestjs/common';
import { TwitchChatModuleOptions } from './twitch-chat-options.interface';

export const {
  ConfigurableModuleClass: ConfigurableTwitchChatModule,
  MODULE_OPTIONS_TOKEN: TWITCH_CHAT_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<TwitchChatModuleOptions>().build();
