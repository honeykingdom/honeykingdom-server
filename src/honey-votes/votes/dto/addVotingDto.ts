import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VotingOptionType } from '../../honey-votes.interface';
import {
  VOTING_DESCRIPTION_MAX_LENGTH,
  VOTING_OPTIONS_LIMIT_MAX,
  VOTING_OPTIONS_LIMIT_MIN,
  VOTING_TITLE_MAX_LENGTH,
} from '../votes.constants';
import { UserTypesParams } from './UserTypesParams';

export class AddVotingDtoBase {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(VOTING_TITLE_MAX_LENGTH)
  @ApiPropertyOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(VOTING_DESCRIPTION_MAX_LENGTH)
  @ApiPropertyOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  canManageVotes?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  canManageVotingOptions?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserTypesParams)
  @ApiPropertyOptional()
  userTypesParams?: UserTypesParams;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(VotingOptionType, { each: true })
  @IsOptional()
  @ApiPropertyOptional({ enum: VotingOptionType, isArray: true })
  allowedVotingOptionTypes?: VotingOptionType[];

  @IsInt()
  @Min(VOTING_OPTIONS_LIMIT_MIN)
  @Max(VOTING_OPTIONS_LIMIT_MAX)
  @IsOptional()
  @ApiPropertyOptional()
  votingOptionsLimit?: number;
}

export class AddVotingDto extends AddVotingDtoBase {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  channelId: string;
}
