import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, Min, ValidateNested } from 'class-validator';
import { TwitchUserType } from '../../honey-votes.interface';

class UserTypeParams {
  @IsBoolean()
  @ApiProperty()
  canVote: boolean;

  @IsBoolean()
  @ApiProperty()
  canAddOptions: boolean;
}
class UserTypeParamsFollower extends UserTypeParams {
  @IsInt()
  @Min(0)
  @ApiProperty()
  minutesToFollowRequiredToVote: number;

  @IsInt()
  @Min(0)
  @ApiProperty()
  minutesToFollowRequiredToAddOptions: number;
}
export class UserTypesParams {
  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.Mod]: UserTypeParams;

  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.Vip]: UserTypeParams;

  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.SubTier1]: UserTypeParams;

  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.SubTier2]: UserTypeParams;

  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.SubTier3]: UserTypeParams;

  @ValidateNested()
  @Type(() => UserTypeParamsFollower)
  @ApiProperty()
  [TwitchUserType.Follower]: UserTypeParamsFollower;

  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.Viewer]: UserTypeParams;
}
