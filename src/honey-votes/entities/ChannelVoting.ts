import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChannelVotingPermissions } from '../votes.interface';

@Entity()
export class ChannelVoting {
  @PrimaryColumn()
  channelId: string;

  @PrimaryColumn()
  channelName: string;

  @Column({ type: 'jsonb' })
  permissions: ChannelVotingPermissions;

  @Column({ type: 'jsonb' })
  admins: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
