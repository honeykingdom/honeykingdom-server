import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserCredentials } from './UserCredentials.entity';
import { ChatVoting } from '../../chat-votes/entities/ChatVoting.entity';
import { Voting } from '../../votes/entities/Voting.entity';
import { Vote } from '../../votes/entities/Vote.entity';
import { VotingOption } from '../../votes/entities/VotingOption.entity';

const USER_TABLE_NAME = 'hv_user';

@Entity(USER_TABLE_NAME)
export class User {
  static readonly tableName = USER_TABLE_NAME;

  @PrimaryColumn()
  id: string;

  @Column()
  login: string;

  @Column({ default: '' })
  displayName: string;

  @Column()
  avatarUrl: string;

  /** If `false` the user needs to re-login */
  @Column({ default: true })
  areTokensValid: boolean;

  @OneToOne(() => UserCredentials, (userCredentials) => userCredentials.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  credentials: UserCredentials;

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
