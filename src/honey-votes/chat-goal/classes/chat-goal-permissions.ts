import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, Min, ValidateNested } from 'class-validator';
import { TwitchUserType } from '../../honey-votes.interface';

class ChatGoalPermissionsDefault {
  @IsBoolean()
  @ApiProperty()
  canVote: boolean;

  @IsInt()
  @Min(0)
  @ApiProperty()
  votesAmount: number;
}

export class ChatGoalPermissions {
  @ValidateNested()
  @Type(() => ChatGoalPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.Mod]: ChatGoalPermissionsDefault;

  @ValidateNested()
  @Type(() => ChatGoalPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.Vip]: ChatGoalPermissionsDefault;

  @ValidateNested()
  @Type(() => ChatGoalPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.SubTier1]: ChatGoalPermissionsDefault;

  @ValidateNested()
  @Type(() => ChatGoalPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.SubTier2]: ChatGoalPermissionsDefault;

  @ValidateNested()
  @Type(() => ChatGoalPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.SubTier3]: ChatGoalPermissionsDefault;

  @ValidateNested()
  @Type(() => ChatGoalPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.Viewer]: ChatGoalPermissionsDefault;
}
