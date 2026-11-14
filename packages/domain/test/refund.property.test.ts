import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { toSen, CancelReason } from '@jom-laut/shared-types';
import { evaluateRefund, STANDARD_POLICIES } from '../src/refund/refund-calculator';

const paidArb = fc.integer({ min: 0, max: 10_000_00 }).map((n) => toSen(n));
const hoursArb = fc.integer({ min: 0, max: 1000 });
const policyArb = fc.constantFrom(...Object.values(STANDARD_POLICIES));

describe('Refund calculator — example-based', () => {
  it('weather/safety cancellation is always a full refund', () => {
    const r = evaluateRefund({
      amountPaidSen: toSen(50000),
      hoursBeforeTrip: 1,
      reason: CancelReason.WEATHER_SAFETY,
      policy: STANDARD_POLICIES.STRICT!,
    });
    expect(r.refundSen).toBe(50000);
    expect(r.fullRefund).toBe(true);
  });

  it('operator cancellation fully refunds the customer', () => {
    const r = evaluateRefund({
      amountPaidSen: toSen(50000),
      hoursBeforeTrip: 1,
      reason: CancelReason.OPERATOR_REQUEST,
      policy: STANDARD_POLICIES.STRICT!,
    });
    expect(r.refundSen).toBe(50000);
  });

  it('flexible policy: full refund >=24h, half <24h', () => {
    const base = { amountPaidSen: toSen(40000), reason: CancelReason.CUSTOMER_REQUEST, policy: STANDARD_POLICIES.FLEXIBLE! };
    expect(evaluateRefund({ ...base, hoursBeforeTrip: 48 }).refundSen).toBe(40000);
    expect(evaluateRefund({ ...base, hoursBeforeTrip: 5 }).refundSen).toBe(20000);
  });
});

describe('Refund calculator — property-based (PBT-03/05)', () => {
  it('refund never exceeds amount paid, for any reason/policy/timing', () => {
    fc.assert(
      fc.property(
        paidArb,
        hoursArb,
        fc.constantFrom(...Object.values(CancelReason)),
        policyArb,
        (amountPaidSen, hoursBeforeTrip, reason, policy) => {
          const r = evaluateRefund({ amountPaidSen, hoursBeforeTrip, reason, policy });
          expect(r.refundSen).toBeGreaterThanOrEqual(0);
          expect(r.refundSen).toBeLessThanOrEqual(amountPaidSen);
        },
      ),
    );
  });

  it('customer refund is monotonic non-decreasing with more notice', () => {
    fc.assert(
      fc.property(paidArb, hoursArb, hoursArb, policyArb, (paid, h1, h2, policy) => {
        const earlier = Math.max(h1, h2);
        const later = Math.min(h1, h2);
        const refundEarlier = evaluateRefund({
          amountPaidSen: paid,
          hoursBeforeTrip: earlier,
          reason: CancelReason.CUSTOMER_REQUEST,
          policy,
        }).refundSen;
        const refundLater = evaluateRefund({
          amountPaidSen: paid,
          hoursBeforeTrip: later,
          reason: CancelReason.CUSTOMER_REQUEST,
          policy,
        }).refundSen;
        // Cancelling with MORE notice (earlier) should never refund less.
        expect(refundEarlier).toBeGreaterThanOrEqual(refundLater);
      }),
    );
  });

  it('weather/safety always fully refunds regardless of timing/policy', () => {
    fc.assert(
      fc.property(paidArb, hoursArb, policyArb, (paid, hours, policy) => {
        const r = evaluateRefund({
          amountPaidSen: paid,
          hoursBeforeTrip: hours,
          reason: CancelReason.WEATHER_SAFETY,
          policy,
        });
        expect(r.refundSen).toBe(paid);
      }),
    );
  });
});
