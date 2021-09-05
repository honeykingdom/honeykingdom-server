import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  UserTypesParams,
  VOTING_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTIONS_LIMIT_MAX,
  VOTING_OPTIONS_LIMIT_MIN,
  VOTING_TITLE_MAX_LENGTH,
} from '../entities/Voting.entity';
import { VotingOptionType } from '../../honey-votes.interface';

export class AddVotingDto {
  @IsString()
  @IsOptional()
  @MaxLength(VOTING_TITLE_MAX_LENGTH)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(VOTING_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsBoolean()
  @IsOptional()
  canManageVotes?: boolean;

  @IsBoolean()
  @IsOptional()
  canManageVotingOptions?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserTypesParams)
  userTypesParams?: UserTypesParams;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(VotingOptionType, { each: true })
  @IsOptional()
  allowedVotingOptionTypes?: VotingOptionType[];

  @IsInt()
  @Min(VOTING_OPTIONS_LIMIT_MIN)
  @Max(VOTING_OPTIONS_LIMIT_MAX)
  @IsOptional()
  votingOptionsLimit?: number;
}
