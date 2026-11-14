import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppLogger } from '../../platform/logger/logger.service.js';

export interface AcquiredHold {
  id: string;
  slotId: string;
  expiresAt: Date;
}

/**
 * Concurrency-safe slot holds (FR-AVAIL-5..8, US-9).
 * Double-booking prevention has two layers:
 *  1) A PostgreSQL PARTIAL UNIQUE INDEX on (slotId) WHERE active = true, applied via
 *     migration (see prisma/migrations/manual/slot_hold_partial_unique.sql). This is the
 *     authoritative guarantee under concurrency.
 *  2) A transactional application check (below) for shared-capacity slots and fast failure.
 * Semantics mirror the property-tested @jom-laut/domain SlotHoldModel.
 */
@Injectable()
export class SlotHoldService {
  private readonly HOLD_TTL_SECONDS = 15 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  async acquireHold(slotId: string, customerId: string, ttlSeconds = this.HOLD_TTL_SECONDS): Promise<AcquiredHold> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const slot = await tx.availabilitySlot.findUnique({
          where: { id: slotId },
          select: { id: true, capacity: true, isExclusive: true, soldOut: true },
        });
        if (!slot) throw new NotFoundException({ code: 'SLOT_NOT_FOUND', message: 'Slot not found' });
        if (slot.soldOut) throw new ConflictException({ code: 'SLOT_SOLD_OUT', message: 'Slot is sold out' });

        const activeHolds = await tx.slotHold.count({
          where: { slotId, active: true, expiresAt: { gt: now } },
        });
        const limit = slot.isExclusive ? 1 : slot.capacity;
        if (activeHolds >= limit) {
          throw new ConflictException({ code: 'SLOT_TAKEN', message: 'Slot is no longer available' });
        }

        const hold = await tx.slotHold.create({
          data: { slotId, customerId, expiresAt, active: true },
          select: { id: true, slotId: true, expiresAt: true },
        });
        return hold;
      });
    } catch (err) {
      // Partial unique index violation → someone else won the race for an exclusive slot.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ code: 'SLOT_TAKEN', message: 'Slot is no longer available' });
      }
      throw err;
    }
  }

  async releaseHold(holdId: string): Promise<void> {
    await this.prisma.slotHold.updateMany({ where: { id: holdId, active: true }, data: { active: false } });
  }

  /** Background expiry (FR-AVAIL-7). Deactivates unconverted holds past expiry. */
  async expireDueHolds(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.slotHold.updateMany({
      where: { active: true, expiresAt: { lte: now }, booking: null },
      data: { active: false },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} slot hold(s)`, 'SlotHoldService');
    }
    return result.count;
  }

  async getActiveHold(holdId: string): Promise<{ id: string; slotId: string; customerId: string; expiresAt: Date } | null> {
    return this.prisma.slotHold.findFirst({
      where: { id: holdId, active: true, expiresAt: { gt: new Date() } },
      select: { id: true, slotId: true, customerId: true, expiresAt: true },
    });
  }
}
