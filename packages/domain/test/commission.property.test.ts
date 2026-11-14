import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { toSen } from '@jom-laut/shared-types';
import { computeCommission, reconciles, CommissionError } from '../src/finance/commission';

describe('Commission — example-based', () => {
  it('15% commission on RM500 with no refund', () => {
    const b = computeCommission({ grossSen: toSen(50000), commissionBasisPoints: 1500 });
    expect(b.commissionSen).toBe(7500);
    expect(b.netToOperatorSen).toBe(42500);
    expect(reconciles(b)).toBe(true);
  });

  it('commission is charged on amount net of refund', () => {
    const b = computeCommission({
      grossSen: toSen(50000),
      commissionBasisPoints: 1500,
      refundSen: toSen(10000),
    });
    expect(b.commissionableSen).toBe(40000);
    expect(b.commissionSen).toBe(6000);
    expect(reconciles(b)).toBe(true);
  });

  it('rejects refund greater than gross', () => {
    expect(() =>
      computeCommission({ grossSen: toSen(100), commissionBasisPoints: 1000, refundSen: toSen(200) }),
    ).toThrow(CommissionError);
  });
});

describe('Commission — property-based (PBT-03 reconciliation invariant)', () => {
  const grossArb = fc.integer({ min: 0, max: 10_000_00 }).map((n) => toSen(n));

  it('gross always equals refund + commission + netToOperator', () => {
    fc.assert(
      fc.property(grossArb, fc.integer({ min: 0, max: 10_000 }), fc.double({ min: 0, max: 1, noNaN: true }), (gross, bps, refundFraction) => {
        const refundSen = toSen(Math.floor(gross * refundFraction));
        const b = computeCommission({ grossSen: gross, commissionBasisPoints: bps, refundSen });
        expect(reconciles(b)).toBe(true);
        expect(b.grossSen).toBe(b.refundSen + b.commissionSen + b.netToOperatorSen);
      }),
    );
  });

  it('commission and net are never negative and never exceed gross', () => {
    fc.assert(
      fc.property(grossArb, fc.integer({ min: 0, max: 10_000 }), (gross, bps) => {
        const b = computeCommission({ grossSen: gross, commissionBasisPoints: bps });
        expect(b.commissionSen).toBeGreaterThanOrEqual(0);
        expect(b.netToOperatorSen).toBeGreaterThanOrEqual(0);
        expect(b.commissionSen).toBeLessThanOrEqual(gross);
      }),
    );
  });
});
