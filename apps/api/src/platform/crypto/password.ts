import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Adaptive password hashing using scrypt (SECURITY-12).
 * Uses Node's built-in crypto — no native build dependency.
 * Format: scrypt$N$r$p$saltB64$hashB64
 */
const N = 16_384; // CPU/memory cost
const r = 8;
const p = 1;
const KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plain, salt, KEYLEN, { N, r, p, maxmem: 64 * 1024 * 1024 })) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallel = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, 'base64');
  const expected = Buffer.from(parts[5]!, 'base64');
  const derived = (await scryptAsync(plain, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallel,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
