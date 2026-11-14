import { type Sen, toSen, percentOfSen } from '@jom-laut/shared-types';

/**
 * Commission & payout breakdown (FR-FIN-6/7, US-25/US-31/US-33).
 * Reconciliation invariant (PBT-03): gross = commission + netToOperator + refund.
 */

export interface CommissionInput {
  /** Gross booking amount actually paid by the customer, in sen. */
  grossSen: Sen;
  /** Platform commission rate in basis points (e.g., 1500 = 15%). */
  commissionBasisPoints: number;
  /** Any refund already granted for this booking, in sen. */
  refundSen?: Sen;
}

export interface CommissionBreakdown {
  grossSen: Sen;
  refundSen: Sen;
  /** Amount commission is charged on (gross minus refund). */
  commissionableSen: Sen;
  commissionSen: Sen;
  netToOperatorSen: Sen;
}

export class CommissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommissionError';
  }
}

export function computeCommission(input: CommissionInput): CommissionBreakdown {
  const { grossSen, commissionBasisPoints } = input;
  const refundSen = input.refundSen ?? toSen(0);

  if (!Number.isInteger(commissionBasisPoints) || commissionBasisPoints < 0 || commissionBasisPoints > 10_000) {
    throw new CommissionError(`commissionBasisPoints must be in [0, 10000]: ${commissionBasisPoints}`);
  }
  if (refundSen > grossSen) {
    throw new CommissionError(`refund (${refundSen}) cannot exceed gross (${grossSen})`);
  }

  // Commission is charged on the amount retained after refunds.
  const commissionableSen = toSen(grossSen - refundSen);
  const commissionSen = percentOfSen(commissionableSen, commissionBasisPoints);
  const netToOperatorSen = toSen(commissionableSen - commissionSen);

  return { grossSen, refundSen, commissionableSen, commissionSen, netToOperatorSen };
}

/**
 * Verify the reconciliation invariant holds for a breakdown.
 * gross = refund + commission + netToOperator
 */
export function reconciles(b: CommissionBreakdown): boolean {
  return b.grossSen === b.refundSen + b.commissionSen + b.netToOperatorSen;
}
