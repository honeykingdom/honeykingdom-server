import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatVoting } from './ChatVoting.entity';

// TODO:
type Badge = any;

@Entity('hv_chat_vote')
export class ChatVote {
  @ManyToOne(() => ChatVoting, (channel) => channel.votes, {
    onDelete: 'CASCADE',
  })
  chatVoting: ChatVoting;

  @PrimaryColumn()
  userId: string;

  @Column({ type: 'jsonb' })
  tags: {
    badgeInfo?: Badge;
    badges: Badge[];
    color?: string;
    displayName?: string;
    login: string;
  };

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
