import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './User.entity';

export const USER_CREDENTIALS_TABLE_NAME = 'hv_user';

// TODO: encrypt tokens
@Entity(USER_CREDENTIALS_TABLE_NAME)
export class UserCredentials {
  @OneToOne(() => User, (user) => user.credentials, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /**
   * Twitch accessToken have an expiration time and also can become invalid
   * when a user changes their password or disconnects an app
   */
  @Column()
  accessToken: string;

  /**
   * Twitch refreshToken never expires but it can become invalid
   * when a user changes their password or disconnects an app
   */
  @Column()
  refreshToken: string;
}
