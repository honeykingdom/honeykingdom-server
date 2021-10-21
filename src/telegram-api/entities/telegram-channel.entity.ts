import { Column, Entity, PrimaryColumn } from 'typeorm';

const TELEGRAM_CHANNEL_TABLE_NAME = 'ta_telegram_channels';

@Entity(TELEGRAM_CHANNEL_TABLE_NAME)
export class TelegramChannel {
  @PrimaryColumn()
  channelName: string;

  @Column()
  lastPostId: number;
}
