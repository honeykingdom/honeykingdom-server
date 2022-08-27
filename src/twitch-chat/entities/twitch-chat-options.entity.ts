import { Column, Entity, PrimaryColumn } from 'typeorm';
import { TokenData } from '../twitch-chat.interface';

const TWITCH_CHAT_OPTIONS_TABLE_NAME = 'tc_options';

@Entity(TWITCH_CHAT_OPTIONS_TABLE_NAME)
export class TwitchChatOptions {
  @PrimaryColumn()
  clientId: string;

  @Column({ type: 'jsonb' })
  tokenData: TokenData;
}
