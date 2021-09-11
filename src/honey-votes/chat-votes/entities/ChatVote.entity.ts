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

  @Column()
  @ApiProperty()
  content: string;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;
}
