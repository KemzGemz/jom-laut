import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingStatus } from '@jom-laut/shared-types';
import {
  BookingEvent,
  transition,
  calculateBookingPrice,
  PaymentMode,
  type PriceInput,
} from '@jom-laut/domain';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SlotHoldService } from '../availability/slot-hold.service.js';
import { EventBus } from '../../platform/events/event-bus.js';

export interface CreateBookingInput {
  holdId: string;
  packageId: string;
  participantCount: number;
  participants: { name: string; phone?: string; isEmergencyContact?: boolean }[];
  organiserNotes?: string;
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holds: SlotHoldService,
    private readonly events: EventBus,
  ) {}

  /** Step 1 of checkout: acquire a concurrency-safe hold (US-9). */
  acquireHold(customerId: string, slotId: string) {
    return this.holds.acquireHold(slotId, customerId);
  }

  /**
   * Create a booking from an active hold (US-10). Idempotent by idempotencyKey.
   * Price is computed server-side (FR-BOOK-2) — any client-supplied amount is ignored.
   */
  async createBooking(customerId: string, input: CreateBookingInput, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.prisma.booking.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }
    if (input.participants.length === 0) {
      throw new BadRequestException({ code: 'NO_PARTICIPANTS', message: 'At least one participant is required' });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const hold = await tx.slotHold.findFirst({
          where: { id: input.holdId, customerId, active: true, expiresAt: { gt: new Date() } },
          select: { id: true, slotId: true },
        });
        if (!hold) throw new ConflictOrGone();

        const slot = await tx.availabilitySlot.findUnique({
          where: { id: hold.slotId },
          select: { id: true, capacity: true, schedule: { select: { listingId: true } } },
        });
        if (!slot) throw new NotFoundException({ code: 'SLOT_NOT_FOUND', message: 'Slot not found' });

        const listingId = slot.schedule.listingId;
        const [listing, pkg] = await Promise.all([
          tx.listing.findUnique({
            where: { id: listingId },
            select: { id: true, bookingModel: true, paymentMode: true, depositBasisPoints: true },
          }),
          tx.package.findUnique({ where: { id: input.packageId }, select: { id: true, listingId: true, priceSen: true, capacity: true } }),
        ]);
        if (!listing) throw new NotFoundException({ code: 'LISTING_NOT_FOUND', message: 'Listing not found' });
        if (!pkg || pkg.listingId !== listingId) {
          throw new BadRequestException({ code: 'PACKAGE_MISMATCH', message: 'Package does not belong to this listing' });
        }

        const priceInput: PriceInput = {
          packagePriceSen: pkg.priceSen as PriceInput['packagePriceSen'],
          participantCount: input.participantCount,
          capacity: pkg.capacity,
          paymentMode: listing.paymentMode === 'DEPOSIT' ? PaymentMode.DEPOSIT : PaymentMode.FULL,
          ...(listing.depositBasisPoints ? { depositBasisPoints: listing.depositBasisPoints } : {}),
        };
        const price = calculateBookingPrice(priceInput);

        // Domain transitions: DRAFT -> SLOT_HELD -> PENDING_PAYMENT.
        const held = transition(BookingStatus.DRAFT, BookingEvent.HOLD_SLOT);
        const pending = transition(held, BookingEvent.PROCEED_TO_PAYMENT);

        const booking = await tx.booking.create({
          data: {
            customerId,
            listingId,
            packageId: pkg.id,
            slotId: slot.id,
            slotHoldId: hold.id,
            status: pending,
            participantCount: input.participantCount,
            totalSen: price.totalSen,
            amountDueNowSen: price.amountDueNowSen,
            organiserNotes: input.organiserNotes ?? null,
            idempotencyKey: idempotencyKey ?? null,
            participants: {
              create: input.participants.map((p) => ({
                name: p.name,
                phone: p.phone ?? null,
                isEmergencyContact: p.isEmergencyContact ?? false,
              })),
            },
            statusHistory: {
              create: [
                { toStatus: held, event: BookingEvent.HOLD_SLOT, actorId: customerId },
                { fromStatus: held, toStatus: pending, event: BookingEvent.PROCEED_TO_PAYMENT, actorId: customerId },
              ],
            },
          },
        });
        return booking;
      });
    } catch (err) {
      if (err instanceof ConflictOrGone) {
        throw new NotFoundException({ code: 'HOLD_EXPIRED', message: 'Slot hold has expired or is invalid' });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Idempotency race: another request created the booking first.
        if (idempotencyKey) {
          const existing = await this.prisma.booking.findUnique({ where: { idempotencyKey } });
          if (existing) return existing;
        }
      }
      throw err;
    }
  }

  /**
   * Apply a domain event to a booking, validating the transition (FR-BOOK-4) and
   * recording history. Used by payment (U7), operator decisions, and outcomes.
   */
  async applyEvent(bookingId: string, event: BookingEvent, actorId?: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true, status: true } });
      if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      const from = booking.status as BookingStatus;
      const to = transition(from, event); // throws InvalidTransitionError if not allowed
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: to,
          statusHistory: { create: { fromStatus: from, toStatus: to, event, actorId: actorId ?? null, reason: reason ?? null } },
        },
        select: { id: true, status: true },
      });
      return updated;
    });
  }

  /** Operator accepts/rejects a request-to-book booking (US-23). */
  async operatorDecision(userId: string, bookingId: string, decision: 'ACCEPT' | 'REJECT') {
    await this.assertBookingOperator(userId, bookingId);
    const event = decision === 'ACCEPT' ? BookingEvent.OPERATOR_ACCEPT : BookingEvent.OPERATOR_REJECT;
    const result = await this.applyEvent(bookingId, event, userId);
    await this.events.publish({
      type: decision === 'ACCEPT' ? 'BookingConfirmed' : 'BookingRejected',
      payload: { bookingId },
    });
    return result;
  }

  /** Operator marks the trip outcome (US-24). */
  async markOutcome(userId: string, bookingId: string, outcome: 'COMPLETED' | 'NO_SHOW') {
    await this.assertBookingOperator(userId, bookingId);
    const event = outcome === 'COMPLETED' ? BookingEvent.MARK_COMPLETED : BookingEvent.MARK_NO_SHOW;
    const result = await this.applyEvent(bookingId, event, userId);
    if (outcome === 'COMPLETED') {
      await this.events.publish({ type: 'BookingCompleted', payload: { bookingId } });
    }
    return result;
  }

  /** Fetch a booking with ownership enforcement (customer, owning operator, or admin). */
  async getBooking(bookingId: string, requester: { sub: string; role: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        listing: { select: { operatorId: true, title: true } },
      },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });

    if (requester.role === 'ADMIN') return booking;
    if (booking.customerId === requester.sub) return booking;
    const isOperator = await this.prisma.operatorMember.findFirst({
      where: { operatorId: booking.listing.operatorId, userId: requester.sub },
      select: { id: true },
    });
    if (!isOperator) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not permitted to view this booking' });
    return booking;
  }

  private async assertBookingOperator(userId: string, bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { listing: { select: { operatorId: true } } },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    const membership = await this.prisma.operatorMember.findFirst({
      where: { operatorId: booking.listing.operatorId, userId },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not permitted for this booking' });
  }
}

/** Internal sentinel to translate an invalid/expired hold into a clean HTTP error. */
class ConflictOrGone extends Error {}
