import { decrypt, encrypt } from './crypto';

describe('Crypto', () => {
  const SECRET = 'PifvLcNkfDcsbrMZzVae8m0cg4rNjnZu';

  it('should encrypt text', () => {
    const text = 'foOGPbqxUfWe7QuW0DWiIpNVydX4ZKpy';
    const result = encrypt(text, SECRET);

    expect(result).not.toBe(text);
    expect(result).toEqual(expect.any(String));
  });

  it('should decrypt text', () => {
    const text = '0XfmkEuEoOaI2NLqOSiaVWWIdMn8qPps';
    const encryptedText = encrypt(text, SECRET);

    expect(decrypt(encryptedText, SECRET)).toBe(text);
  });
});
