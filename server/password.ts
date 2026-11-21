import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64) as Buffer;
  return salt + ':' + key.toString('hex');
}

export async function verifyPassword(password: string, hash: string) {
  const [salt, storedKey] = hash.split(':');
  const expected = Buffer.from(storedKey, 'hex');
  const supplied = await deriveKey(password, salt, expected.length) as Buffer;
  return timingSafeEqual(expected, supplied);
}
