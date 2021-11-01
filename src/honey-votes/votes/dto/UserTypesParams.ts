import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, Min, ValidateNested } from 'class-validator';
import { SubTier, TwitchUserType } from '../../honey-votes.interface';

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
class UserTypeParamsSubscriber extends UserTypeParams {
  @IsEnum(SubTier)
  @ApiProperty()
  subTierRequiredToVote: SubTier;

  @IsEnum(SubTier)
  @ApiProperty()
  subTierRequiredToAddOptions: SubTier;
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
  @Type(() => UserTypeParamsSubscriber)
  @ApiProperty()
  [TwitchUserType.Sub]: UserTypeParamsSubscriber;

  @ValidateNested()
  @Type(() => UserTypeParamsFollower)
  @ApiProperty()
  [TwitchUserType.Follower]: UserTypeParamsFollower;

  @ValidateNested()
  @Type(() => UserTypeParams)
  @ApiProperty()
  [TwitchUserType.Viewer]: UserTypeParams;
}
