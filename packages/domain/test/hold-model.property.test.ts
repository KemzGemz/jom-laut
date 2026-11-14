import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SlotHoldModel, HoldConflictError } from '../src/slot-hold/hold-model';

describe('SlotHoldModel — example-based', () => {
  it('prevents a second hold on the same exclusive slot', () => {
    const m = new SlotHoldModel();
    m.acquire('h1', 'slotA', 'cust1', 1000, 0);
    expect(() => m.acquire('h2', 'slotA', 'cust2', 1000, 0)).toThrow(HoldConflictError);
  });

  it('allows re-acquisition after expiry', () => {
    const m = new SlotHoldModel();
    m.acquire('h1', 'slotA', 'cust1', 1000, 0);
    m.expire(2000); // h1 expired
    expect(() => m.acquire('h2', 'slotA', 'cust2', 3000, 2000)).not.toThrow();
  });

  it('a converted reservation blocks new holds even past original expiry', () => {
    const m = new SlotHoldModel();
    m.acquire('h1', 'slotA', 'cust1', 1000, 0);
    m.convert('h1', 500);
    expect(() => m.acquire('h2', 'slotA', 'cust2', 5000, 5000)).toThrow(HoldConflictError);
  });
});

describe('SlotHoldModel — property-based (PBT-06 stateful concurrency safety)', () => {
  type Op =
    | { kind: 'acquire'; holdId: string; slotId: string; ttl: number }
    | { kind: 'release'; holdId: string }
    | { kind: 'convert'; holdId: string }
    | { kind: 'expire'; advance: number };

  const slotIdArb = fc.constantFrom('slotA', 'slotB', 'slotC');
  const holdIdArb = fc.constantFrom('h1', 'h2', 'h3', 'h4', 'h5');

  const opArb: fc.Arbitrary<Op> = fc.oneof(
    fc.record({ kind: fc.constant('acquire' as const), holdId: holdIdArb, slotId: slotIdArb, ttl: fc.integer({ min: 1, max: 100 }) }),
    fc.record({ kind: fc.constant('release' as const), holdId: holdIdArb }),
    fc.record({ kind: fc.constant('convert' as const), holdId: holdIdArb }),
    fc.record({ kind: fc.constant('expire' as const), advance: fc.integer({ min: 0, max: 50 }) }),
  );

  it('the one-active-hold-per-slot invariant holds after every operation sequence', () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
        const m = new SlotHoldModel();
        let now = 0;
        for (const op of ops) {
          try {
            switch (op.kind) {
              case 'acquire':
                m.acquire(op.holdId, op.slotId, 'cust', now + op.ttl, now);
                break;
              case 'release':
                m.release(op.holdId);
                break;
              case 'convert':
                m.convert(op.holdId, now);
                break;
              case 'expire':
                now += op.advance;
                m.expire(now);
                break;
            }
          } catch (e) {
            // Conflicts and illegal converts are expected to be rejected; that is correct behaviour.
            expect(e).toBeInstanceOf(Error);
          }
          // Core safety invariant must hold no matter what.
          expect(m.invariantHolds(now)).toBe(true);
        }
      }),
    );
  });
});
