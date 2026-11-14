import { type Sen, toSen, percentOfSen } from '@jom-laut/shared-types';

/**
 * Authoritative price calculation (FR-BOOK-2, US-10).
 * MVP model: per-boat / per-package pricing with fixed capacity (B3=A).
 * The server always computes this; client-supplied prices are ignored.
 */

export const PaymentMode = {
  FULL: 'FULL',
  DEPOSIT: 'DEPOSIT',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export interface PriceInput {
  /** Fixed package price for the whole boat, in sen. */
  packagePriceSen: Sen;
  /** Number of participants for this booking. */
  participantCount: number;
  /** Maximum capacity of the package/boat. */
  capacity: number;
  paymentMode: PaymentMode;
  /** Deposit as basis points of total (e.g., 3000 = 30%). Required when paymentMode = DEPOSIT. */
  depositBasisPoints?: number;
}

export interface PriceResult {
  totalSen: Sen;
  amountDueNowSen: Sen;
  balanceSen: Sen;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export function calculateBookingPrice(input: PriceInput): PriceResult {
  const { packagePriceSen, participantCount, capacity, paymentMode, depositBasisPoints } = input;

  if (!Number.isInteger(participantCount) || participantCount < 1) {
    throw new PricingError(`participantCount must be a positive integer: ${participantCount}`);
  }
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new PricingError(`capacity must be a positive integer: ${capacity}`);
  }
  if (participantCount > capacity) {
    throw new PricingError(`participantCount (${participantCount}) exceeds capacity (${capacity})`);
  }

  const totalSen = packagePriceSen;

  let amountDueNowSen: Sen;
  if (paymentMode === PaymentMode.FULL) {
    amountDueNowSen = totalSen;
  } else {
    if (depositBasisPoints === undefined) {
      throw new PricingError('depositBasisPoints is required for DEPOSIT payment mode');
    }
    if (!Number.isInteger(depositBasisPoints) || depositBasisPoints <= 0 || depositBasisPoints > 10_000) {
      throw new PricingError(`depositBasisPoints must be in (0, 10000]: ${depositBasisPoints}`);
    }
    amountDueNowSen = percentOfSen(totalSen, depositBasisPoints);
  }

  const balanceSen = toSen(totalSen - amountDueNowSen);
  return { totalSen, amountDueNowSen, balanceSen };
}
