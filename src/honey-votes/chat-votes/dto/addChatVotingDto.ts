import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TwitchUserType } from '../../honey-votes.interface';

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
}

export class AddChatVotingDto extends AddChatVotingDtoBase {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  broadcasterId: string;
}
