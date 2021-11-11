import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatGoalPermissions } from '../classes/chat-goal-permissions';
import {
  CHAT_GOAL_TITLE_MAX_LENGTH,
  CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH,
} from '../chat-goal.constants';

export class CreateChatGoalDtoBase {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatGoalPermissions)
  @ApiPropertyOptional()
  permissions?: ChatGoalPermissions;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  listening?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_GOAL_TITLE_MAX_LENGTH)
  @ApiPropertyOptional()
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH)
  @ApiPropertyOptional()
  upvoteCommand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_GOAL_VOTE_COMMAND_MAX_LENGTH)
  @ApiPropertyOptional()
  downvoteCommand?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  timerDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  maxVotesValue?: number;
}

export class CreateChatGoalDto extends CreateChatGoalDtoBase {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  broadcasterId: string;
}
