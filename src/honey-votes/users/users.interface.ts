import { ApiProperty } from '@nestjs/swagger';
import type { User } from './entities/user.entity';
import { SubTier, TwitchUserType } from '../honey-votes.constants';

export class UserRoles {
  @ApiProperty({ nullable: true })
  [TwitchUserType.Broadcaster]: boolean | null;

  @ApiProperty({ nullable: true })
  [TwitchUserType.Editor]: boolean | null;

  @ApiProperty({ nullable: true })
  [TwitchUserType.Mod]: boolean | null;

  @ApiProperty({ nullable: true })
  [TwitchUserType.Vip]: boolean | null;

  @ApiProperty({ nullable: true })
  [TwitchUserType.Sub]: boolean | null;

  @ApiProperty({ nullable: true })
  [TwitchUserType.Follower]: boolean | null;

  @ApiProperty({ nullable: true })
  minutesFollowed: number | null;

  @ApiProperty({ nullable: true })
  subTier: SubTier | null;
}

export type StoreUserCredentials = {
  scope: string[];
  accessToken: string;
  refreshToken: string;
};
export type StoreUser = Omit<User, 'credentials'> & {
  credentials: StoreUserCredentials;
};
