import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../platform/config/env.js';
import type { ChargeInput, ChargeResult, PaymentProvider, WebhookResult } from '../payment-provider.js';
import { verifyWebhookSignature } from '../webhook-signature.js';

/**
 * Generic payment-gateway adapter (FPX/cards/e-wallets via an aggregator).
 * Confirms payment via signature-verified server-to-server webhooks (FR-PAY-3/4).
 * The concrete vendor's charge-creation call is finalized in an ADR.
 */
@Injectable()
export class GatewayAdapter implements PaymentProvider {
  readonly name = 'gateway';

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    // A real implementation calls the provider API here and returns its checkout URL.
    const providerTxnId = `gw_${input.bookingId}_${Date.now()}`;
    return { providerTxnId, redirectUrl: `https://pay.example/checkout/${providerTxnId}` };
  }

  verifyAndParseWebhook(rawBody: string, signature: string): WebhookResult {
    if (!verifyWebhookSignature(this.config.PAYMENT_WEBHOOK_SECRET, rawBody, signature)) {
      throw new UnauthorizedException({ code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature' });
    }
    const parsed = JSON.parse(rawBody) as {
      id: string;
      txnId: string;
      type: string;
      status: string;
    };
    return {
      providerEventId: parsed.id,
      providerTxnId: parsed.txnId,
      eventType: parsed.type,
      status: parsed.status === 'succeeded' || parsed.status === 'CONFIRMED' ? 'CONFIRMED' : 'FAILED',
    };
  }

  async refund(providerTxnId: string): Promise<{ refundRef: string }> {
    return { refundRef: `gw-refund-${providerTxnId}` };
  }
}
