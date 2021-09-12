// https://github.com/parse-community/parse-server/blob/master/src/Adapters/Files/GridFSBucketAdapter.js
import crypto from 'crypto';

const DEFAULT_ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 32;

/**
 * Key bytes length depends on algorithm being used:
 * * 'aes-128-gcm' = 16 bytes
 * * 'aes-192-gcm' = 24 bytes
 * * 'aes-256-gcm' = 32 bytes
 */
export const encrypt = (
  text: string,
  key: string,
  algorithm = DEFAULT_ALGORITHM,
) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  return Buffer.concat([
    cipher.update(text),
    cipher.final(),
    iv,
    cipher.getAuthTag(),
  ]).toString('hex');
};

export const decrypt = (
  text: string,
  key: string,
  algorithm = DEFAULT_ALGORITHM,
) => {
  const data = Buffer.from(text, 'hex');

  const authTagLocation = data.length - IV_LENGTH;
  const ivLocation = data.length - AUTH_TAG_LENGTH;
  const authTag = data.slice(authTagLocation);
  const iv = data.slice(ivLocation, authTagLocation);
  const encrypted = data.slice(0, ivLocation);

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString();
};
