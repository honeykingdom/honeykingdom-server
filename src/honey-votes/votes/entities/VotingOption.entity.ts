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

export const VOTING_OPTION_TABLE_NAME = 'hv_voting_option';

export const VOTING_OPTION_CARD_TITLE_MAX_LENGTH = 50;
export const VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH = 255;
export const VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH = 255;

@Entity(VOTING_OPTION_TABLE_NAME)
export class VotingOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.votingOptions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @RelationId((votingOption: VotingOption) => votingOption.user)
  userId: string;

  @ManyToOne(() => Voting, (voting) => voting.votingOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'votingId' })
  voting: Voting;

  @RelationId((votingOption: VotingOption) => votingOption.voting)
  votingId: number;

  @OneToMany(() => Vote, (vote) => vote.votingOption)
  votes: Vote[];

  @Column({ default: 0 })
  fullVotesValue: number;

  @Column({ type: 'enum', enum: VotingOptionType })
  type: VotingOptionType;

  // card
  @Column({ nullable: true })
  cardId?: number;

  @Column({ length: VOTING_OPTION_CARD_TITLE_MAX_LENGTH })
  cardTitle: string;

  @Column({ nullable: true, length: VOTING_OPTION_CARD_SUBTITLE_MAX_LENGTH })
  cardSubtitle?: string;

  @Column({ nullable: true, length: VOTING_OPTION_CARD_DESCRIPTION_MAX_LENGTH })
  cardDescription?: string;

  @Column({ nullable: true })
  cardImageUrl?: string;

  @Column({ nullable: true })
  cardUrl?: string;
  // end card

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
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
