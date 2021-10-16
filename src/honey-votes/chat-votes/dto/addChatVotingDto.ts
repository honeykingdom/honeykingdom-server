import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
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
import { TwitchUserType } from '../../honey-votes.interface';
import { CHAT_VOTING_COMMAND_MAX_LENGTH } from '../chat-votes.constants';

export class ChatVotingRestrictions {
  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.Viewer]: boolean;

  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.SubTier1]: boolean;

  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.SubTier2]: boolean;

  @IsBoolean()
  @ApiProperty()
  [TwitchUserType.SubTier3]: boolean;

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

export class AddChatVotingDtoBase {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatVotingRestrictions)
  @ApiPropertyOptional()
  restrictions?: ChatVotingRestrictions;

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

export class AddChatVotingDto extends AddChatVotingDtoBase {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  broadcasterId: string;
}
