import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

/** Operator availability management (US-21/22). */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(userId: string, listingId: string, name?: string) {
    await this.assertListingOwner(userId, listingId);
    return this.prisma.availabilitySchedule.create({
      data: { listingId, name: name ?? null },
      select: { id: true, name: true },
    });
  }

  /** Add a slot; rejects overlaps with existing slots in the same schedule (US-21 AC3). */
  async addSlot(
    userId: string,
    scheduleId: string,
    input: { startsAt: Date; endsAt: Date; capacity: number; isExclusive?: boolean },
  ) {
    const schedule = await this.prisma.availabilitySchedule.findUnique({
      where: { id: scheduleId },
      select: { listingId: true },
    });
    if (!schedule) throw new NotFoundException({ code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found' });
    await this.assertListingOwner(userId, schedule.listingId);

    if (input.endsAt <= input.startsAt) {
      throw new ConflictException({ code: 'INVALID_SLOT_RANGE', message: 'endsAt must be after startsAt' });
    }
    const overlap = await this.prisma.availabilitySlot.findFirst({
      where: { scheduleId, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } },
      select: { id: true },
    });
    if (overlap) {
      throw new ConflictException({ code: 'SLOT_OVERLAP', message: 'Slot overlaps an existing slot' });
    }

    return this.prisma.availabilitySlot.create({
      data: {
        scheduleId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacity: input.capacity,
        isExclusive: input.isExclusive ?? true,
      },
      select: { id: true, startsAt: true, endsAt: true, capacity: true, isExclusive: true },
    });
  }

  async blockDate(userId: string, listingId: string, date: Date, reason?: string) {
    await this.assertListingOwner(userId, listingId);
    return this.prisma.blockedDate.upsert({
      where: { listingId_date: { listingId, date } },
      create: { listingId, date, reason: reason ?? null },
      update: { reason: reason ?? null },
      select: { id: true, date: true },
    });
  }

  async markSoldOut(userId: string, slotId: string) {
    const slot = await this.loadSlotWithListing(slotId);
    await this.assertListingOwner(userId, slot.listingId);
    return this.prisma.availabilitySlot.update({ where: { id: slotId }, data: { soldOut: true }, select: { id: true, soldOut: true } });
  }

  /** Calendar view including active holds (US-22), scoped to the operator's listing. */
  async getCalendar(userId: string, listingId: string, from: Date, to: Date) {
    await this.assertListingOwner(userId, listingId);
    const now = new Date();
    const [slots, blocked] = await Promise.all([
      this.prisma.availabilitySlot.findMany({
        where: { schedule: { listingId }, startsAt: { gte: from, lt: to } },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          soldOut: true,
          isExclusive: true,
          holds: { where: { active: true, expiresAt: { gt: now } }, select: { id: true, expiresAt: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.blockedDate.findMany({
        where: { listingId, date: { gte: from, lt: to } },
        select: { date: true, reason: true },
      }),
    ]);
    return { slots, blockedDates: blocked };
  }

  private async loadSlotWithListing(slotId: string): Promise<{ listingId: string }> {
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      select: { schedule: { select: { listingId: true } } },
    });
    if (!slot) throw new NotFoundException({ code: 'SLOT_NOT_FOUND', message: 'Slot not found' });
    return { listingId: slot.schedule.listingId };
  }

  private async assertListingOwner(userId: string, listingId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { operatorId: true } });
    if (!listing) throw new NotFoundException({ code: 'LISTING_NOT_FOUND', message: 'Listing not found' });
    const membership = await this.prisma.operatorMember.findFirst({
      where: { operatorId: listing.operatorId, userId },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'NOT_LISTING_OWNER', message: 'Not permitted for this listing' });
  }
}
