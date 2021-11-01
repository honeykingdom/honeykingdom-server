import { ApiProperty } from '@nestjs/swagger';
import { SubTier } from '../honey-votes.interface';

export class UserRoles {
  @ApiProperty({ nullable: true })
  isEditor: boolean | null;

  @ApiProperty({ nullable: true })
  isMod: boolean | null;

  @ApiProperty({ nullable: true })
  isVip: boolean | null;

  @ApiProperty({ nullable: true })
  isSub: boolean | null;

  @ApiProperty({ nullable: true })
  isFollower: boolean | null;

  @ApiProperty({ nullable: true })
  minutesFollowed: number | null;

  @ApiProperty({ nullable: true })
  subTier: SubTier | null;
}
