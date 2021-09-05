import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatVoting } from '../../chat-votes/entities/ChatVoting.entity';
import { Voting } from '../../votes/entities/Voting.entity';
import { Vote } from '../../votes/entities/Vote.entity';
import { VotingOption } from '../../votes/entities/VotingOption.entity';

export const USER_TABLE_NAME = 'hv_user';

@Entity(USER_TABLE_NAME)
export class User {
  @PrimaryColumn()
  id: string;

  /**
   * Twitch accessToken have an expiration time and also can become invalid
   * when a user changes their password or disconnects an app
   */
  @Column()
  accessToken: string;

  /**
   * Twitch refreshToken never expires but it can become invalid
   * when a user changes their password or disconnects an app
   */
  @Column()
  refreshToken: string;

  @Column()
  login: string;

  @Column({ default: '' })
  displayName: string;

  @Column()
  avatarUrl: string;

  /** If `false` the user needs to re-login */
  @Column({ default: true })
  areTokensValid: boolean;

  // @OneToOne(() => ChatVoting, (chatVoting) => chatVoting.user, {
  //   onDelete: 'SET NULL',
  // })
  // chatVoting: ChatVoting;

  @OneToMany(() => Voting, (voting) => voting.user)
  votingList: Voting[];

  @OneToMany(() => VotingOption, (votingOption) => votingOption.user)
  votingOptions: VotingOption[];

  @OneToMany(() => Vote, (vote) => vote.user)
  votes: Vote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
