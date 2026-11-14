import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { toSen } from '@jom-laut/shared-types';
import { calculateBookingPrice, PaymentMode, PricingError } from '../src/pricing/price';

describe('Pricing — example-based', () => {
  it('full payment charges the whole package', () => {
    const r = calculateBookingPrice({
      packagePriceSen: toSen(50000),
      participantCount: 4,
      capacity: 6,
      paymentMode: PaymentMode.FULL,
    });
    expect(r.totalSen).toBe(50000);
    expect(r.amountDueNowSen).toBe(50000);
    expect(r.balanceSen).toBe(0);
  });

  it('deposit charges the configured percentage', () => {
    const r = calculateBookingPrice({
      packagePriceSen: toSen(50000),
      participantCount: 2,
      capacity: 6,
      paymentMode: PaymentMode.DEPOSIT,
      depositBasisPoints: 3000,
    });
    expect(r.amountDueNowSen).toBe(15000);
    expect(r.balanceSen).toBe(35000);
  });

  it('rejects participants over capacity', () => {
    expect(() =>
      calculateBookingPrice({
        packagePriceSen: toSen(1000),
        participantCount: 7,
        capacity: 6,
        paymentMode: PaymentMode.FULL,
      }),
    ).toThrow(PricingError);
  });
});

describe('Pricing — property-based (PBT-03 invariants)', () => {
  const priceArb = fc.integer({ min: 0, max: 10_000_00 }).map((n) => toSen(n));
  const capacityArb = fc.integer({ min: 1, max: 50 });

  it('amountDueNow + balance always equals total', () => {
    fc.assert(
      fc.property(
        priceArb,
        capacityArb,
        fc.integer({ min: 1, max: 10_000 }),
        (price, capacity, bps) => {
          const participantCount = 1;
          const r = calculateBookingPrice({
            packagePriceSen: price,
            participantCount,
            capacity,
            paymentMode: PaymentMode.DEPOSIT,
            depositBasisPoints: bps,
          });
          expect(r.amountDueNowSen + r.balanceSen).toBe(r.totalSen);
        },
      ),
    );
  });

  it('amountDueNow never exceeds total, deposit never exceeds full', () => {
    fc.assert(
      fc.property(priceArb, fc.integer({ min: 1, max: 10_000 }), (price, bps) => {
        const r = calculateBookingPrice({
          packagePriceSen: price,
          participantCount: 1,
          capacity: 1,
          paymentMode: PaymentMode.DEPOSIT,
          depositBasisPoints: bps,
        });
        expect(r.amountDueNowSen).toBeLessThanOrEqual(r.totalSen);
      }),
    );
  });

  it('any participantCount within capacity is accepted', () => {
    fc.assert(
      fc.property(priceArb, capacityArb, (price, capacity) => {
        const participantCount = capacity; // boundary
        const r = calculateBookingPrice({
          packagePriceSen: price,
          participantCount,
          capacity,
          paymentMode: PaymentMode.FULL,
        });
        expect(r.totalSen).toBe(price);
      }),
    );
  });
});
