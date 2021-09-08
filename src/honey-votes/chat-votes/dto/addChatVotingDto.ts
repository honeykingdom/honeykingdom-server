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
  [TwitchUserType.Viewer]: boolean;
  @IsBoolean()
  [TwitchUserType.SubTier1]: boolean;
  @IsBoolean()
  [TwitchUserType.SubTier2]: boolean;
  @IsBoolean()
  [TwitchUserType.SubTier3]: boolean;
  @IsBoolean()
  [TwitchUserType.Mod]: boolean;
  @IsBoolean()
  [TwitchUserType.Vip]: boolean;
  @IsInt()
  @Min(0)
  subMonthsRequired: number;
}

export class AddChatVotingDtoBase {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatVotingRestrictions)
  restrictions?: ChatVotingRestrictions;

  @IsOptional()
  @IsBoolean()
  listening?: boolean;
}

export class AddChatVotingDto extends AddChatVotingDtoBase {
  @IsString()
  @IsNotEmpty()
  broadcasterId: string;
}
