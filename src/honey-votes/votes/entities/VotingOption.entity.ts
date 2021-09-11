import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/User.entity';
import { VotingOptionType } from '../../honey-votes.interface';
import { Vote } from './Vote.entity';
import { Voting } from './Voting.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VOTING_OPTION_TABLE_NAME = 'hv_voting_option';

export const VOTING_OPTION_CARD_TITLE_MAX_LENGTH = 50;
export const VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH = 255;
export const VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH = 255;

@Entity(VOTING_OPTION_TABLE_NAME)
export class VotingOption {
  static readonly tableName = VOTING_OPTION_TABLE_NAME;

  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User, (user) => user.votingOptions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @RelationId((votingOption: VotingOption) => votingOption.author)
  @ApiProperty()
  authorId: string;

  @ManyToOne(() => Voting, (voting) => voting.votingOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'votingId' })
  voting: Voting;

  @RelationId((votingOption: VotingOption) => votingOption.voting)
  @ApiProperty()
  votingId: number;

  @OneToMany(() => Vote, (vote) => vote.votingOption)
  votes: Vote[];

  @Column({ default: 0 })
  @ApiProperty()
  fullVotesValue: number;

  @Column({ type: 'enum', enum: VotingOptionType })
  type: VotingOptionType;

  // card
  @Column({ nullable: true })
  @ApiPropertyOptional()
  cardId?: number;

  @Column({ length: VOTING_OPTION_CARD_TITLE_MAX_LENGTH })
  @ApiProperty()
  cardTitle: string;

  @Column({ nullable: true, length: VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH })
  @ApiPropertyOptional()
  cardSubtitle?: string;

  @Column({ nullable: true, length: VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH })
  @ApiPropertyOptional()
  cardDescription?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional()
  cardImageUrl?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional()
  cardUrl?: string;
  // end card

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;
}

export type VotingOptionCard = Pick<
  VotingOption,
  | 'cardId'
  | 'cardTitle'
  | 'cardSubtitle'
  | 'cardDescription'
  | 'cardImageUrl'
  | 'cardUrl'
>;
