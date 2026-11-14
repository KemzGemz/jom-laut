import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256 webhook signing/verification (FR-PAY-3, SECURITY-13).
 * Payments are confirmed only via signature-verified provider webhooks — never a
 * client redirect. Verification is constant-time.
 */
export function signWebhook(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(secret: string, payload: string, signature: string): boolean {
  const expected = signWebhook(secret, payload);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
