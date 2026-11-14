import { describe, it, expect } from 'vitest';
import { SecretBox } from './secret-box.js';

describe('SecretBox (AES-256-GCM)', () => {
  const box = new SecretBox('operator-payout-encryption-secret');

  it('round-trips plaintext', () => {
    const secret = JSON.stringify({ bank: 'Maybank', account: '1234567890' });
    const enc = box.encrypt(secret);
    expect(enc).not.toContain('Maybank');
    expect(box.decrypt(enc)).toBe(secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(box.encrypt('same')).not.toBe(box.encrypt('same'));
  });

  it('fails to decrypt tampered ciphertext (auth tag)', () => {
    const enc = box.encrypt('sensitive');
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0xff; // flip a byte in the ciphertext
    expect(() => box.decrypt(buf.toString('base64'))).toThrow();
  });

  it('fails to decrypt with the wrong key', () => {
    const enc = box.encrypt('sensitive');
    const other = new SecretBox('a-different-secret');
    expect(() => other.decrypt(enc)).toThrow();
  });
});
