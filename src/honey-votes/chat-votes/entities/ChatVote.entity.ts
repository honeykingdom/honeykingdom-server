import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { UserStateTags } from 'twitch-js';
import { ChatVoting } from './ChatVoting.entity';

const CHAT_VOTE_TABLE_NAME = 'hv_chat_vote';

type Tags = Pick<
  UserStateTags,
  'badgeInfo' | 'badges' | 'color' | 'displayName' | 'emotes'
>;

@Entity(CHAT_VOTE_TABLE_NAME)
export class ChatVote {
  static readonly tableName = CHAT_VOTE_TABLE_NAME;

  @ManyToOne(() => ChatVoting, (channel) => channel.votes, {
    primary: true,
    onDelete: 'CASCADE',
  })
  chatVoting: ChatVoting;

  @RelationId((chatVote: ChatVote) => chatVote.chatVoting)
  chatVotingId: number;

  @PrimaryColumn()
  userId: string;

  @Column()
  userName: string;

  @Column({ type: 'jsonb', default: {} })
  tags: Tags;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
