import { Injectable } from '@nestjs/common';
import type { ChargeInput, ChargeResult, PaymentProvider, WebhookResult } from '../payment-provider.js';

/**
 * Manual bank-transfer adapter for the controlled pilot (D1=C).
 * No webhook; an admin verifies the transfer (confirmManualTransfer).
 */
@Injectable()
export class ManualTransferAdapter implements PaymentProvider {
  readonly name = 'manual';

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    return { providerTxnId: `manual-${input.bookingId}` };
  }

  verifyAndParseWebhook(): WebhookResult {
    throw new Error('Manual transfer provider does not process webhooks; use admin verification');
  }

  async refund(providerTxnId: string): Promise<{ refundRef: string }> {
    return { refundRef: `manual-refund-${providerTxnId}` };
  }
}
