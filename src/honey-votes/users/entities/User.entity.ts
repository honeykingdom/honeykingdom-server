import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty()
  id: string;

  @Column()
  @ApiProperty()
  login: string;

  @Column({ default: '' })
  @ApiProperty()
  displayName: string;

  @Column()
  @ApiProperty()
  avatarUrl: string;

  /** If `false` the user needs to re-login */
  @Column({ default: true })
  @ApiProperty()
  areTokensValid: boolean;

  @OneToOne(() => UserCredentials, (userCredentials) => userCredentials.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  credentials: UserCredentials;

  @OneToOne(() => ChatVoting, (chatVoting) => chatVoting.broadcaster, {
    onDelete: 'SET NULL',
  })
  chatVoting: ChatVoting;

  @OneToMany(() => Voting, (voting) => voting.broadcaster)
  votingList: Voting[];

  @OneToMany(() => VotingOption, (votingOption) => votingOption.author)
  votingOptions: VotingOption[];

  @OneToMany(() => Vote, (vote) => vote.author)
  votes: Vote[];

  @CreateDateColumn({ type: 'timestamptz', select: false })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', select: false })
  @ApiProperty()
  updatedAt: Date;
}
