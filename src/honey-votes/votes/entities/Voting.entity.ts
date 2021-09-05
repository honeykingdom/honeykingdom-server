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
import { IsBoolean, IsInt, Min, ValidateNested } from 'class-validator';
import { User } from '../../users/entities/User.entity';
import { Vote } from './Vote.entity';
import { TwitchUserType } from '../../honey-votes.interface';
import { VotingOption } from './VotingOption.entity';
import { VotingOptionType } from '../../honey-votes.interface';
import { Type } from 'class-transformer';

class UserTypeParams {
  @IsBoolean()
  canVote: boolean;
  @IsBoolean()
  canAddOptions: boolean;
}
class UserTypeParamsFollower extends UserTypeParams {
  @IsInt()
  @Min(0)
  minutesToFollowRequiredToVote: number;
  @IsInt()
  @Min(0)
  minutesToFollowRequiredToAddOptions: number;
}
export class UserTypesParams {
  @ValidateNested()
  @Type(() => UserTypeParams)
  [TwitchUserType.Mod]: UserTypeParams;
  @ValidateNested()
  @Type(() => UserTypeParams)
  [TwitchUserType.Vip]: UserTypeParams;
  @ValidateNested()
  @Type(() => UserTypeParams)
  [TwitchUserType.SubTier1]: UserTypeParams;
  @ValidateNested()
  @Type(() => UserTypeParams)
  [TwitchUserType.SubTier2]: UserTypeParams;
  @ValidateNested()
  @Type(() => UserTypeParams)
  [TwitchUserType.SubTier3]: UserTypeParams;
  @ValidateNested()
  @Type(() => UserTypeParamsFollower)
  [TwitchUserType.Follower]: UserTypeParamsFollower;
  @ValidateNested()
  @Type(() => UserTypeParams)
  [TwitchUserType.Viewer]: UserTypeParams;
}

export const VOTING_TABLE_NAME = 'hv_voting';

export const VOTING_TITLE_MAX_LENGTH = 50;
export const VOTING_DESCRIPTION_MAX_LENGTH = 255;

export const VOTING_OPTIONS_LIMIT_MIN = 2;
export const VOTING_OPTIONS_LIMIT_MAX = 200;

export const VOTING_CAN_MANAGE_VOTES_DEFAULT = true;
export const VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT = true;
export const VOTING_USER_TYPES_PARAMS_DEFAULT: UserTypesParams = {
  [TwitchUserType.Mod]: { canVote: true, canAddOptions: true },
  [TwitchUserType.Vip]: { canVote: true, canAddOptions: true },
  [TwitchUserType.SubTier1]: { canVote: true, canAddOptions: true },
  [TwitchUserType.SubTier2]: { canVote: true, canAddOptions: true },
  [TwitchUserType.SubTier3]: { canVote: true, canAddOptions: true },
  [TwitchUserType.Follower]: {
    canVote: false,
    canAddOptions: false,
    minutesToFollowRequiredToVote: 0,
    minutesToFollowRequiredToAddOptions: 0,
  },
  [TwitchUserType.Viewer]: { canVote: false, canAddOptions: false },
};
export const VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT: VotingOptionType[] = [
  VotingOptionType.KinopoiskMovie,
  VotingOptionType.IgdbGame,
  VotingOptionType.Custom,
];
export const VOTING_OPTIONS_LIMIT_DEFAULT = 100;

@Entity(VOTING_TABLE_NAME)
export class Voting {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.votingList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @RelationId((voting: Voting) => voting.user)
  userId: string;

  @Column({ nullable: true, length: VOTING_TITLE_MAX_LENGTH })
  title?: string;

  @Column({ nullable: true, length: VOTING_DESCRIPTION_MAX_LENGTH })
  description?: string;

  @Column({ default: VOTING_CAN_MANAGE_VOTES_DEFAULT })
  canManageVotes: boolean;

  @Column({ default: VOTING_CAN_MANAGE_VOTING_OPTIONS_DEFAULT })
  canManageVotingOptions: boolean;

  @Column({ type: 'jsonb', default: VOTING_USER_TYPES_PARAMS_DEFAULT })
  userTypesParams: UserTypesParams;

  @Column({
    type: 'enum',
    enum: VotingOptionType,
    array: true,
    default: VOTING_ALLOWED_VOTING_OPTIONS_TYPES_DEFAULT,
  })
  allowedVotingOptionTypes: VotingOptionType[];

  @OneToMany(() => VotingOption, (votingOption) => votingOption.voting)
  votingOptions: VotingOption[];

  @Column({ type: 'integer', default: VOTING_OPTIONS_LIMIT_DEFAULT })
  votingOptionsLimit: number;

  @OneToMany(() => Vote, (vote) => vote.voting)
  votes: Vote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
