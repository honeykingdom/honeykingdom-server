import { ApiProperty } from '@nestjs/swagger';

export class UserRoles {
  @ApiProperty()
  isEditor: boolean;

  @ApiProperty()
  isMod: boolean;

  @ApiProperty()
  isVip: boolean;

  @ApiProperty()
  isSubTier1: boolean;

  @ApiProperty()
  isSubTier2: boolean;

  @ApiProperty()
  isSubTier3: boolean;

  @ApiProperty()
  isFollower: boolean;

  @ApiProperty()
  minutesFollowed: number | null;
}
