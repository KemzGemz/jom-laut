/**
 * Slot-hold reference model (FR-AVAIL-5..8, US-9).
 *
 * In production, exclusive-slot double-booking is prevented by a PostgreSQL
 * uniqueness constraint acquired inside a transaction. This pure model mirrors
 * that guarantee and is used as the oracle for stateful property tests (PBT-06):
 * at most ONE active hold or reservation may exist for an exclusive slot at any time.
 */

export interface Hold {
  holdId: string;
  slotId: string;
  customerId: string;
  expiresAt: number; // epoch ms (UTC)
  converted: boolean; // true once turned into a reservation
}

export class HoldConflictError extends Error {
  constructor(readonly slotId: string) {
    super(`Slot ${slotId} already has an active hold or reservation`);
    this.name = 'HoldConflictError';
  }
}

export class SlotHoldModel {
  private readonly holds = new Map<string, Hold>(); // holdId -> Hold

  /** An active hold: not expired and either unconverted or a live reservation. */
  private activeForSlot(slotId: string, now: number): Hold | undefined {
    for (const h of this.holds.values()) {
      if (h.slotId !== slotId) continue;
      if (h.converted) return h; // reservations never expire
      if (h.expiresAt > now) return h; // unexpired hold
    }
    return undefined;
  }

  /** Attempt to acquire a hold. Throws HoldConflictError if the exclusive slot is taken. */
  acquire(holdId: string, slotId: string, customerId: string, expiresAt: number, now: number): Hold {
    if (this.activeForSlot(slotId, now)) {
      throw new HoldConflictError(slotId);
    }
    const hold: Hold = { holdId, slotId, customerId, expiresAt, converted: false };
    this.holds.set(holdId, hold);
    return hold;
  }

  release(holdId: string): void {
    this.holds.delete(holdId);
  }

  /** Convert a live hold into a reservation (on payment confirmation). */
  convert(holdId: string, now: number): void {
    const hold = this.holds.get(holdId);
    if (!hold) throw new Error(`Unknown hold ${holdId}`);
    if (!hold.converted && hold.expiresAt <= now) {
      throw new Error(`Hold ${holdId} has expired and cannot be converted`);
    }
    hold.converted = true;
  }

  /** Remove expired, unconverted holds (background expiry job). Returns count removed. */
  expire(now: number): number {
    let removed = 0;
    for (const [id, h] of this.holds) {
      if (!h.converted && h.expiresAt <= now) {
        this.holds.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /** Invariant checker: no exclusive slot has more than one active hold/reservation. */
  invariantHolds(now: number): boolean {
    const counts = new Map<string, number>();
    for (const h of this.holds.values()) {
      const active = h.converted || h.expiresAt > now;
      if (active) counts.set(h.slotId, (counts.get(h.slotId) ?? 0) + 1);
    }
    return [...counts.values()].every((c) => c <= 1);
  }

  activeCount(now: number): number {
    let n = 0;
    for (const h of this.holds.values()) if (h.converted || h.expiresAt > now) n++;
    return n;
  }
}
