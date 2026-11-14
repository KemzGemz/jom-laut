import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CancelReason } from '@jom-laut/shared-types';
import { BookingEvent, evaluateRefund, STANDARD_POLICIES, type CancellationPolicy } from '@jom-laut/domain';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EventBus } from '../../platform/events/event-bus.js';
import { BookingService } from '../bookings/booking.service.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider.js';

const ADMIN_REQUIRED: ReadonlySet<CancelReason> = new Set([CancelReason.WEATHER_SAFETY, CancelReason.FORCE_MAJEURE]);

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingService,
    private readonly events: EventBus,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Customer/operator requests cancellation (US-15). Weather/safety await admin approval. */
  async requestCancellation(requester: { sub: string; role: string }, bookingId: string, reason: CancelReason) {
    const booking = await this.loadBookingForCancellation(bookingId);
    await this.assertCanCancel(requester, booking);

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING_OPERATOR_APPROVAL) {
      throw new ForbiddenException({ code: 'NOT_CANCELLABLE', message: `Booking cannot be cancelled from ${booking.status}` });
    }

    const { refundSen, hoursBeforeTrip } = await this.computeRefund(bookingId, reason);

    await this.bookings.applyEvent(bookingId, BookingEvent.REQUEST_CANCELLATION, requester.sub, reason);
    await this.prisma.cancellationRequest.upsert({
      where: { bookingId },
      create: { bookingId, reason, requestedBy: requester.sub, hoursBeforeTrip, computedRefundSen: refundSen, adminApproved: false },
      update: { reason, computedRefundSen: refundSen, hoursBeforeTrip },
    });
    await this.events.publish({ type: 'CancellationRequested', payload: { bookingId, reason } });

    if (!ADMIN_REQUIRED.has(reason)) {
      // Policy-based customer/operator cancellations process immediately.
      return this.processCancellation(bookingId, refundSen, reason);
    }
    return { status: 'PENDING_ADMIN_APPROVAL' as const, computedRefundSen: refundSen };
  }

  /** Admin approves a weather/safety (or disputed) cancellation and processes the refund (US-30). */
  async adminApproveCancellation(adminId: string, bookingId: string) {
    const request = await this.prisma.cancellationRequest.findUnique({ where: { bookingId } });
    if (!request) throw new NotFoundException({ code: 'NO_CANCELLATION_REQUEST', message: 'No cancellation request' });
    await this.prisma.cancellationRequest.update({ where: { bookingId }, data: { adminApproved: true } });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'CANCELLATION_APPROVED', targetType: 'Booking', targetId: bookingId },
    });
    return this.processCancellation(bookingId, request.computedRefundSen, request.reason as CancelReason);
  }

  private async processCancellation(bookingId: string, refundSen: number, reason: CancelReason) {
    // CANCELLATION_REQUESTED -> CANCELLED -> REFUND_PENDING
    await this.bookings.applyEvent(bookingId, BookingEvent.CONFIRM_CANCELLATION);
    await this.bookings.applyEvent(bookingId, BookingEvent.START_REFUND);

    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'CONFIRMED' },
      select: { id: true, providerTxnId: true },
    });

    const refund = await this.prisma.refund.create({
      data: {
        bookingId,
        paymentId: payment?.id ?? null,
        amountSen: refundSen,
        reason,
        status: refundSen > 0 ? 'PROCESSING' : 'COMPLETED',
      },
      select: { id: true },
    });
    await this.events.publish({ type: 'RefundInitiated', payload: { bookingId, refundSen } });

    if (refundSen > 0 && payment?.providerTxnId) {
      await this.provider.refund(payment.providerTxnId, refundSen);
      await this.prisma.refund.update({ where: { id: refund.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    }

    await this.bookings.applyEvent(bookingId, BookingEvent.REFUND_COMPLETED);
    await this.reopenAvailability(bookingId);
    await this.events.publish({ type: 'RefundCompleted', payload: { bookingId, refundSen } });
    return { status: 'REFUNDED' as const, refundSen };
  }

  /** Reopen the slot when a cancellation frees it (FR-FIN-9). */
  private async reopenAvailability(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { slotId: true, slotHoldId: true } });
    if (!booking) return;
    await this.prisma.availabilitySlot.update({ where: { id: booking.slotId }, data: { soldOut: false } });
    if (booking.slotHoldId) {
      await this.prisma.slotHold.updateMany({ where: { id: booking.slotHoldId, active: true }, data: { active: false } });
    }
  }

  private async computeRefund(bookingId: string, reason: CancelReason): Promise<{ refundSen: number; hoursBeforeTrip: number }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { slot: { select: { startsAt: true } }, listing: { select: { cancellationPolicy: { select: { name: true, tiers: true } } } } },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });

    const paidAgg = await this.prisma.payment.aggregate({
      where: { bookingId, status: 'CONFIRMED' },
      _sum: { amountSen: true },
    });
    const amountPaidSen = paidAgg._sum.amountSen ?? 0;
    const hoursBeforeTrip = Math.max(0, Math.floor((booking.slot.startsAt.getTime() - Date.now()) / 3_600_000));

    const policy = this.resolvePolicy(booking.listing.cancellationPolicy);
    const result = evaluateRefund({
      amountPaidSen: amountPaidSen as never,
      hoursBeforeTrip,
      reason,
      policy,
    });
    return { refundSen: result.refundSen, hoursBeforeTrip };
  }

  private resolvePolicy(policy: { name: string; tiers: unknown } | null): CancellationPolicy {
    if (policy && Array.isArray(policy.tiers)) {
      return { name: policy.name, tiers: policy.tiers as CancellationPolicy['tiers'] };
    }
    return STANDARD_POLICIES.MODERATE!;
  }

  private async loadBookingForCancellation(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, status: true, listing: { select: { operatorId: true } } },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    return booking;
  }

  private async assertCanCancel(
    requester: { sub: string; role: string },
    booking: { customerId: string; listing: { operatorId: string } },
  ): Promise<void> {
    if (requester.role === 'ADMIN' || booking.customerId === requester.sub) return;
    const membership = await this.prisma.operatorMember.findFirst({
      where: { operatorId: booking.listing.operatorId, userId: requester.sub },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not permitted to cancel this booking' });
  }
}
