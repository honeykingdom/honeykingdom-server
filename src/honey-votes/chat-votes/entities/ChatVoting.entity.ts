import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { ChatVote } from './ChatVote.entity';
import { User } from '../../users/entities/User.entity';
import { TwitchUserType } from '../../honey-votes.interface';

export type ChatVotingRestrictions = {
  [TwitchUserType.Viewer]: boolean;
  /** If number, only users subscribed for at least the specified number of months can vote */
  [TwitchUserType.Sub]: boolean | number;
  [TwitchUserType.Mod]: boolean;
  [TwitchUserType.Vip]: boolean;
};

@Entity('hv_chat_voting')
export class ChatVoting {
  // @OneToOne(() => User, (user) => user.chatVoting, { onDelete: 'CASCADE' })
  // @JoinColumn()
  user: User;
  userId: string;

  @Column({ type: 'jsonb' })
  restrictions: ChatVotingRestrictions;

  /** Is chat listening currently enabled */
  @Column({ default: false })
  listening: boolean;

  @OneToMany(() => ChatVote, (chatVote) => chatVote.chatVoting)
  votes: ChatVote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
