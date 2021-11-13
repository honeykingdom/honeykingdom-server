import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, Min, ValidateNested } from 'class-validator';
import { SubTier, TwitchUserType } from '../../honey-votes.constants';

class VotingPermissionsDefault {
  @IsBoolean()
  @ApiProperty()
  canVote: boolean;

  @IsBoolean()
  @ApiProperty()
  canAddOptions: boolean;
}
class VotingPermissionsFollower extends VotingPermissionsDefault {
  @IsInt()
  @Min(0)
  @ApiProperty()
  minutesToFollowRequiredToVote: number;

  @IsInt()
  @Min(0)
  @ApiProperty()
  minutesToFollowRequiredToAddOptions: number;
}
class VotingPermissionsSubscriber extends VotingPermissionsDefault {
  @IsEnum(SubTier)
  @ApiProperty()
  subTierRequiredToVote: SubTier;

  @IsEnum(SubTier)
  @ApiProperty()
  subTierRequiredToAddOptions: SubTier;
}
export class VotingPermissions {
  @ValidateNested()
  @Type(() => VotingPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.Mod]: VotingPermissionsDefault;

  @ValidateNested()
  @Type(() => VotingPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.Vip]: VotingPermissionsDefault;

  @ValidateNested()
  @Type(() => VotingPermissionsSubscriber)
  @ApiProperty()
  [TwitchUserType.Sub]: VotingPermissionsSubscriber;

  @ValidateNested()
  @Type(() => VotingPermissionsFollower)
  @ApiProperty()
  [TwitchUserType.Follower]: VotingPermissionsFollower;

  @ValidateNested()
  @Type(() => VotingPermissionsDefault)
  @ApiProperty()
  [TwitchUserType.Viewer]: VotingPermissionsDefault;
}
