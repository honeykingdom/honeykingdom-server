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
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Vote } from './vote.entity';
import { VotingOption } from './voting-option.entity';
import { VotingOptionType } from '../../honey-votes.interface';
import { VotingPermissions } from '../dto/VotingPermissions';
import {
  VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  VOTING_CAN_MANAGE_VOTES_DEFAULT,
  VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT,
  VOTING_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTIONS_LIMIT_DEFAULT,
  VOTING_TABLE_NAME,
  VOTING_TITLE_MAX_LENGTH,
  VOTING_PERMISSIONS_DEFAULT,
  VOTING_OPTIONS_LIMIT_MIN,
  VOTING_OPTIONS_LIMIT_MAX,
} from '../votes.constants';

@ApiExtraModels(Vote)
@Entity(VOTING_TABLE_NAME)
export class Voting {
  static readonly tableName = VOTING_TABLE_NAME;

  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @ManyToOne(() => User, (user) => user.votingList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'broadcasterId' })
  broadcaster: User;

  @RelationId((voting: Voting) => voting.broadcaster)
  @ApiProperty()
  broadcasterId: string;

  @Column({ nullable: true, length: VOTING_TITLE_MAX_LENGTH })
  @ApiPropertyOptional({ maxLength: VOTING_TITLE_MAX_LENGTH })
  title?: string;

  @Column({ nullable: true, length: VOTING_DESCRIPTION_MAX_LENGTH })
  @ApiPropertyOptional({ maxLength: VOTING_DESCRIPTION_MAX_LENGTH })
  description?: string;

  @Column({ default: VOTING_CAN_MANAGE_VOTES_DEFAULT })
  @ApiProperty({ default: VOTING_CAN_MANAGE_VOTES_DEFAULT })
  canManageVotes: boolean;

  @Column({ default: VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT })
  @ApiProperty({ default: VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT })
  canManageVotingOptions: boolean;

  @Column({ type: 'jsonb', default: VOTING_PERMISSIONS_DEFAULT })
  @ApiProperty({ default: VOTING_PERMISSIONS_DEFAULT })
  permissions: VotingPermissions;

  @Column({
    type: 'enum',
    enum: VotingOptionType,
    array: true,
    default: VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  })
  @ApiProperty({
    enum: VotingOptionType,
    enumName: 'VotingOptionType',
    isArray: true,
    default: VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  })
  allowedVotingOptionTypes: VotingOptionType[];

  @OneToMany(() => VotingOption, (votingOption) => votingOption.voting)
  votingOptions: VotingOption[];

  @Column({ type: 'integer', default: VOTING_OPTIONS_LIMIT_DEFAULT })
  @ApiProperty({
    default: VOTING_OPTIONS_LIMIT_DEFAULT,
    minimum: VOTING_OPTIONS_LIMIT_MIN,
    maximum: VOTING_OPTIONS_LIMIT_MAX,
  })
  votingOptionsLimit: number;

  @OneToMany(() => Vote, (vote) => vote.voting)
  votes: Vote[];

  @CreateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  @ApiProperty()
  updatedAt: Date;
}
