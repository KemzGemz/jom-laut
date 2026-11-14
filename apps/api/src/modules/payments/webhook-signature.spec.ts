import { describe, it, expect } from 'vitest';
import { signWebhook, verifyWebhookSignature } from './webhook-signature.js';

describe('webhook signature (HMAC-SHA256)', () => {
  const secret = 'provider-webhook-secret';
  const payload = JSON.stringify({ id: 'evt_1', txnId: 'txn_1', status: 'CONFIRMED' });

  it('verifies a correctly signed payload', () => {
    const sig = signWebhook(secret, payload);
    expect(verifyWebhookSignature(secret, payload, sig)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    expect(verifyWebhookSignature(secret, payload, signWebhook(secret, 'tampered'))).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    const sig = signWebhook('other-secret', payload);
    expect(verifyWebhookSignature(secret, payload, sig)).toBe(false);
  });

  it('rejects malformed hex signatures without throwing', () => {
    expect(verifyWebhookSignature(secret, payload, 'zz')).toBe(false);
  });
});
