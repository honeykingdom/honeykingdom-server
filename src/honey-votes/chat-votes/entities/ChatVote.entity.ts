import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
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

  @ManyToOne(() => ChatVoting, (chatVoting) => chatVoting.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chatVotingId' })
  chatVoting: ChatVoting;

  // https://github.com/typeorm/typeorm/issues/3952#issuecomment-562188666
  @PrimaryColumn()
  chatVotingId: string;

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
