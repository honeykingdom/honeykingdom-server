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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { VotingOptionType } from '../../honey-votes.constants';
import { Vote } from './vote.entity';
import { Voting } from './voting.entity';
import {
  VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH,
  VOTING_OPTION_CARD_TITLE_MAX_LENGTH,
  VOTING_OPTION_TABLE_NAME,
} from '../votes.constants';

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

  @Column({ default: '' })
  @ApiProperty({ default: '' })
  authorLogin: string;

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

  @Column({ type: 'enum', enum: VotingOptionType })
  @ApiProperty({ enum: VotingOptionType, enumName: 'VotingOptionType' })
  type: VotingOptionType;

  // card
  @Column({ nullable: true })
  @ApiPropertyOptional()
  cardId?: string;

  @Column({ length: VOTING_OPTION_CARD_TITLE_MAX_LENGTH })
  @ApiProperty({ maxLength: VOTING_OPTION_CARD_TITLE_MAX_LENGTH })
  cardTitle: string;

  @Column({ nullable: true, length: VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH })
  @ApiPropertyOptional({ maxLength: VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH })
  cardSubtitle?: string;

  @Column({ nullable: true, length: VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH })
  @ApiPropertyOptional({ maxLength: VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH })
  cardDescription?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional()
  cardImageUrl?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional()
  cardUrl?: string;
  // end card

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
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
