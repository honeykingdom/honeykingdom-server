import { ApiProperty } from '@nestjs/swagger';

export class UserRoles {
  @ApiProperty({ nullable: true })
  isEditor: boolean | null;

  @ApiProperty({ nullable: true })
  isMod: boolean | null;

  @ApiProperty({ nullable: true })
  isVip: boolean | null;

  @ApiProperty({ nullable: true })
  isSubTier1: boolean | null;

  @ApiProperty({ nullable: true })
  isSubTier2: boolean | null;

  @ApiProperty({ nullable: true })
  isSubTier3: boolean | null;

  @ApiProperty({ nullable: true })
  isFollower: boolean | null;

  @ApiProperty({ nullable: true })
  minutesFollowed: number | null;
}
