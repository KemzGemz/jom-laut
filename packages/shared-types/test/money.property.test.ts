import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  addSen,
  subSen,
  mulSen,
  percentOfSen,
  formatMyr,
  parseMyr,
  toSen,
  isValidSen,
  MoneyError,
  type Sen,
} from '../src/money';

// Domain generator: valid non-negative sen amounts within a realistic marketplace range.
const senArb = fc.integer({ min: 0, max: 1_000_000_00 }).map((n) => toSen(n));

describe('Money — example-based', () => {
  it('formats sen as MYR', () => {
    expect(formatMyr(toSen(25000))).toBe('RM250.00');
    expect(formatMyr(toSen(120050))).toBe('RM1200.50');
    expect(formatMyr(toSen(0))).toBe('RM0.00');
    expect(formatMyr(toSen(5))).toBe('RM0.05');
  });

  it('rejects invalid sen', () => {
    expect(() => toSen(-1)).toThrow(MoneyError);
    expect(() => toSen(1.5)).toThrow(MoneyError);
  });

  it('computes commission via basis points (10% of RM250 = RM25)', () => {
    expect(percentOfSen(toSen(25000), 1000)).toBe(2500);
  });

  it('subSen fails closed on negative result', () => {
    expect(() => subSen(toSen(100), toSen(200))).toThrow(MoneyError);
  });
});

describe('Money — property-based (PBT-02 round-trip)', () => {
  it('parseMyr(formatMyr(x)) === x for all valid sen', () => {
    fc.assert(
      fc.property(senArb, (x: Sen) => {
        expect(parseMyr(formatMyr(x))).toBe(x);
      }),
    );
  });
});

describe('Money — property-based (PBT-03 invariants)', () => {
  it('addSen is commutative', () => {
    fc.assert(
      fc.property(senArb, senArb, (a: Sen, b: Sen) => {
        expect(addSen(a, b)).toBe(addSen(b, a));
      }),
    );
  });

  it('addSen is associative', () => {
    fc.assert(
      fc.property(senArb, senArb, senArb, (a: Sen, b: Sen, c: Sen) => {
        expect(addSen(addSen(a, b), c)).toBe(addSen(a, addSen(b, c)));
      }),
    );
  });

  it('add then subtract returns the original (a + b - b = a)', () => {
    fc.assert(
      fc.property(senArb, senArb, (a: Sen, b: Sen) => {
        expect(subSen(addSen(a, b), b)).toBe(a);
      }),
    );
  });

  it('result of every operation is always a valid sen', () => {
    fc.assert(
      fc.property(senArb, senArb, fc.integer({ min: 0, max: 100 }), (a: Sen, b: Sen, q) => {
        expect(isValidSen(addSen(a, b))).toBe(true);
        expect(isValidSen(mulSen(a, q))).toBe(true);
      }),
    );
  });

  it('percentOfSen never exceeds the base amount for <=100% (<=10000 bps)', () => {
    fc.assert(
      fc.property(senArb, fc.integer({ min: 0, max: 10_000 }), (a: Sen, bps) => {
        expect(percentOfSen(a, bps)).toBeLessThanOrEqual(a);
      }),
    );
  });
});
