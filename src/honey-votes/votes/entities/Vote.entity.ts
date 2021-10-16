import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/User.entity';
import { VOTE_TABLE_NAME } from '../votes.constants';
import { Voting } from './Voting.entity';
import { VotingOption } from './VotingOption.entity';

@Entity(VOTE_TABLE_NAME)
export class Vote {
  static readonly tableName = VOTE_TABLE_NAME;

  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User, (user) => user.votes, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @RelationId((vote: Vote) => vote.author)
  @ApiProperty()
  authorId: string;

  @ManyToOne(() => Voting, (voting) => voting.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'votingId' })
  voting: Voting;

  @RelationId((vote: Vote) => vote.voting)
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
  @ApiProperty()
  value: number;

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
