import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { ChatVote } from './ChatVote.entity';
import { User } from '../../users/entities/User.entity';
import { TwitchUserType } from '../../honey-votes.interface';
import { ChatVotingRestrictions } from '../dto/addChatVotingDto';

const CHAT_VOTING_TABLE_NAME = 'hv_chat_voting';

export const DEFAULT_CHAT_VOTING_RESTRICTIONS: ChatVotingRestrictions = {
  [TwitchUserType.Viewer]: false,
  [TwitchUserType.SubTier1]: true,
  [TwitchUserType.SubTier2]: true,
  [TwitchUserType.SubTier3]: true,
  [TwitchUserType.Mod]: true,
  [TwitchUserType.Vip]: true,
  subMonthsRequired: 0,
};

@Entity(CHAT_VOTING_TABLE_NAME)
export class ChatVoting {
  static readonly tableName = CHAT_VOTING_TABLE_NAME;

  @OneToOne(() => User, (user) => user.chatVoting, { onDelete: 'CASCADE' })
  @JoinColumn()
  broadcaster: User;

  @RelationId((chatVoting: ChatVoting) => chatVoting.broadcaster)
  broadcasterId: string;

  @Column({ type: 'jsonb', default: DEFAULT_CHAT_VOTING_RESTRICTIONS })
  restrictions: ChatVotingRestrictions;

  @Column({ default: false })
  listening: boolean;

  @OneToMany(() => ChatVote, (chatVote) => chatVote.chatVoting)
  votes: ChatVote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
