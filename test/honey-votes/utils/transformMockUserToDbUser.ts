import { encrypt } from '../../../src/crypto/crypto';
import { MockUser } from './users';

export const transformMockUserToDbUser =
  (secret: string) =>
  ({ credentials, ...rest }: MockUser) => ({
    ...rest,
    credentials: {
      encryptedAccessToken: encrypt(credentials.accessToken, secret),
      encryptedRefreshToken: encrypt(credentials.refreshToken, secret),
    },
  });
