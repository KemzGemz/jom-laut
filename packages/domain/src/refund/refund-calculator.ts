import { type Sen, toSen, percentOfSen, CancelReason } from '@jom-laut/shared-types';

/**
 * Refund rule engine (FR-FIN-2/3, US-15/US-30).
 * Refund eligibility depends on the policy template, cancellation timing, and reason.
 * Pure and deterministic — heavily property-tested (PBT-03/05).
 */

/**
 * A cancellation policy template: tiers by hours-before-trip, each granting a
 * refund percentage (basis points) of the amount paid. Tiers are evaluated from
 * the most generous threshold downward.
 */
export interface RefundTier {
  /** Minimum hours before trip for this tier to apply. */
  minHoursBefore: number;
  /** Refund as basis points of amount paid (e.g., 10000 = 100%). */
  refundBasisPoints: number;
}

export interface CancellationPolicy {
  name: string;
  tiers: RefundTier[];
}

export interface RefundInput {
  amountPaidSen: Sen;
  hoursBeforeTrip: number;
  reason: CancelReason;
  policy: CancellationPolicy;
}

export interface RefundResult {
  refundSen: Sen;
  appliedBasisPoints: number;
  fullRefund: boolean;
  rationale: string;
}

/**
 * Weather/safety and force-majeure cancellations always yield a full refund
 * regardless of timing (B6=A), tagged for admin review.
 */
function isAlwaysFullRefund(reason: CancelReason): boolean {
  return reason === CancelReason.WEATHER_SAFETY || reason === CancelReason.FORCE_MAJEURE;
}

export function evaluateRefund(input: RefundInput): RefundResult {
  const { amountPaidSen, hoursBeforeTrip, reason, policy } = input;

  if (isAlwaysFullRefund(reason)) {
    return {
      refundSen: amountPaidSen,
      appliedBasisPoints: 10_000,
      fullRefund: true,
      rationale: `Full refund due to ${reason} (admin-reviewed).`,
    };
  }

  // Operator-initiated cancellations always fully refund the customer.
  if (reason === CancelReason.OPERATOR_REQUEST) {
    return {
      refundSen: amountPaidSen,
      appliedBasisPoints: 10_000,
      fullRefund: true,
      rationale: 'Full refund due to operator cancellation.',
    };
  }

  // Customer/admin cancellation: apply the policy tier for the timing.
  const sorted = [...policy.tiers].sort((a, b) => b.minHoursBefore - a.minHoursBefore);
  const tier = sorted.find((t) => hoursBeforeTrip >= t.minHoursBefore);
  const bps = tier?.refundBasisPoints ?? 0;
  const refundSen = percentOfSen(amountPaidSen, bps);

  return {
    refundSen: toSen(Math.min(refundSen, amountPaidSen)),
    appliedBasisPoints: bps,
    fullRefund: bps >= 10_000,
    rationale: tier
      ? `Policy "${policy.name}": ${bps / 100}% refund for cancellation ${hoursBeforeTrip}h before trip.`
      : `Policy "${policy.name}": no refund for cancellation ${hoursBeforeTrip}h before trip.`,
  };
}

/** Standard platform policy templates (B5=A: platform-provided, operator selects). */
export const STANDARD_POLICIES: Record<string, CancellationPolicy> = {
  FLEXIBLE: {
    name: 'Flexible',
    tiers: [
      { minHoursBefore: 24, refundBasisPoints: 10_000 },
      { minHoursBefore: 0, refundBasisPoints: 5_000 },
    ],
  },
  MODERATE: {
    name: 'Moderate',
    tiers: [
      { minHoursBefore: 72, refundBasisPoints: 10_000 },
      { minHoursBefore: 24, refundBasisPoints: 5_000 },
      { minHoursBefore: 0, refundBasisPoints: 0 },
    ],
  },
  STRICT: {
    name: 'Strict',
    tiers: [
      { minHoursBefore: 168, refundBasisPoints: 5_000 },
      { minHoursBefore: 0, refundBasisPoints: 0 },
    ],
  },
};
