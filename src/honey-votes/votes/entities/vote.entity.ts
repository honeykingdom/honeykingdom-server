import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VOTE_TABLE_NAME } from '../votes.constants';
import { Voting } from './voting.entity';
import { VotingOption } from './voting-option.entity';

@Entity(VOTE_TABLE_NAME)
export class Vote {
  static readonly tableName = VOTE_TABLE_NAME;

  @ManyToOne(() => User, (user) => user.votes, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @PrimaryColumn()
  @ApiProperty()
  authorId: string;

  @ManyToOne(() => Voting, (voting) => voting.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'votingId' })
  voting: Voting;

  @PrimaryColumn()
  @ApiProperty()
  votingId: number;

  @ManyToOne(() => VotingOption, (votingOption) => votingOption.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'votingOptionId' })
  votingOption: VotingOption;

  @RelationId((vote: Vote) => vote.votingOption)
  @ApiProperty()
  votingOptionId: number;

  @Column({ type: 'integer', default: 1 })
  @ApiProperty({ default: 1 })
  value: number;

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
