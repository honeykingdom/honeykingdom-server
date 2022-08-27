import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatVoting } from './chat-voting.entity';
import {
  CHAT_VOTE_CONTENT_MAX_LENGTH,
  CHAT_VOTE_TABLE_NAME,
} from '../chat-votes.constants';

type Tags = {
  badgeInfo: Record<string, string>;
  badges: Record<string, string>;
  color?: string;
  displayName?: string;
  emoteOffsets: Record<string, string[]>;
};

@Entity(CHAT_VOTE_TABLE_NAME)
export class ChatVote {
  static readonly tableName = CHAT_VOTE_TABLE_NAME;

  @ManyToOne(() => ChatVoting, (chatVoting) => chatVoting.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chatVotingId' })
  chatVoting: ChatVoting;

  // https://github.com/typeorm/typeorm/issues/3952#issuecomment-562188666
  @PrimaryColumn()
  @ApiProperty()
  chatVotingId: string;

  @PrimaryColumn()
  @ApiProperty()
  userId: string;

  @Column()
  @ApiProperty()
  userName: string;

  @Column({ type: 'jsonb', default: {} })
  @ApiProperty()
  tags: Tags;

  @Column({ length: CHAT_VOTE_CONTENT_MAX_LENGTH })
  @ApiProperty({ maxLength: CHAT_VOTE_CONTENT_MAX_LENGTH })
  content: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
