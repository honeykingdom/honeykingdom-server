import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

const USER_CREDENTIALS_TABLE_NAME = 'hv_user_credentials';

@Entity(USER_CREDENTIALS_TABLE_NAME)
export class UserCredentials {
  static readonly tableName = USER_CREDENTIALS_TABLE_NAME;

  @PrimaryColumn()
  userId: number;

  @OneToOne(() => User, (user) => user.credentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar', array: true })
  scope: string[];

  /**
   * Twitch accessToken have an expiration time and also can become invalid
   * when a user changes their password or disconnects an app
   */
  @Column()
  encryptedAccessToken: string;

  /**
   * Twitch refreshToken never expires but it can become invalid
   * when a user changes their password or disconnects an app
   */
  @Column()
  encryptedRefreshToken: string;
}
