import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubTier, TwitchUserType } from '../../honey-votes.interface';
import { CHAT_VOTING_COMMAND_MAX_LENGTH } from '../chat-votes.constants';

export class ChatVotingPermissions {
  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.Viewer]: boolean;

  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.Sub]: boolean;

  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.Mod]: boolean;

  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.Vip]: boolean;

  @IsInt()
  @Min(0)
  @ApiProperty()
  subMonthsRequired: number;

  @IsEnum(SubTier)
  @ApiProperty()
  subTierRequired: SubTier;
}

export class ChatVotingCommands {
  @IsString()
  @Length(1, CHAT_VOTING_COMMAND_MAX_LENGTH)
  // https://regex101.com/r/NRejOy/1
  @Matches(/^[^ ].+[^ ]$/)
  @ApiProperty()
  vote: string;

  @IsString()
  @Length(1, CHAT_VOTING_COMMAND_MAX_LENGTH)
  @Matches(/^[^ ].+[^ ]$/)
  @ApiProperty()
  clearVotes: string;
}

export class CreateChatVotingDtoBase {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatVotingPermissions)
  @ApiPropertyOptional()
  permissions?: ChatVotingPermissions;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  listening?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatVotingCommands)
  @ApiPropertyOptional()
  commands?: ChatVotingCommands;
}

export class CreateChatVotingDto extends CreateChatVotingDtoBase {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  broadcasterId: string;
}
