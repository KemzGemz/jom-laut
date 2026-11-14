/** PaymentProvider port (D1=C). Adapters (manual, gateway) are swappable behind this interface. */

export interface ChargeInput {
  bookingId: string;
  amountSen: number;
  method: string;
}

export interface ChargeResult {
  providerTxnId: string;
  redirectUrl?: string;
}

export interface WebhookResult {
  providerEventId: string;
  providerTxnId: string;
  eventType: string;
  status: 'CONFIRMED' | 'FAILED';
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: ChargeInput): Promise<ChargeResult>;
  /** Verify signature and parse a webhook. Throws if the signature is invalid. */
  verifyAndParseWebhook(rawBody: string, signature: string): WebhookResult;
  refund(providerTxnId: string, amountSen: number): Promise<{ refundRef: string }>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
