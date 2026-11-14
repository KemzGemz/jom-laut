import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BookingStatus } from '@jom-laut/shared-types';
import { BookingEvent } from '@jom-laut/domain';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EventBus } from '../../platform/events/event-bus.js';
import { BookingService } from '../bookings/booking.service.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.js';

type Method = 'MANUAL_TRANSFER' | 'FPX' | 'CARD' | 'EWALLET';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly bookings: BookingService,
    private readonly events: EventBus,
  ) {}

  /** Initiate payment for a booking (US-12). Amount is taken from the server-computed booking. */
  async initiatePayment(customerId: string, bookingId: string, method: Method, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findFirst({ where: { idempotencyKey } });
      if (existing) return { paymentId: existing.id };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, amountDueNowSen: true, status: true },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    if (booking.customerId !== customerId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your booking' });
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new ConflictException({ code: 'BOOKING_NOT_PAYABLE', message: `Booking is not awaiting payment (${booking.status})` });
    }

    const charge = await this.provider.createCharge({ bookingId, amountSen: booking.amountDueNowSen, method });

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        customerId,
        amountSen: booking.amountDueNowSen,
        provider: this.provider.name,
        providerTxnId: charge.providerTxnId,
        method,
        status: 'INITIATED',
        idempotencyKey: idempotencyKey ?? null,
      },
      select: { id: true },
    });

    await this.bookings.applyEvent(bookingId, BookingEvent.PAYMENT_PROCESSING, customerId);
    return { paymentId: payment.id, redirectUrl: charge.redirectUrl };
  }

  /** Process a provider webhook (FR-PAY-3/4/5). Signature-verified and idempotent. */
  async handleWebhook(rawBody: string, signature: string) {
    const result = this.provider.verifyAndParseWebhook(rawBody, signature);

    const payment = await this.prisma.payment.findFirst({
      where: { provider: this.provider.name, providerTxnId: result.providerTxnId },
      select: { id: true, bookingId: true },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found for transaction' });

    // Idempotency: providerEventId is unique; a duplicate webhook is a no-op.
    try {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: result.eventType,
          payload: result as unknown as Prisma.InputJsonValue,
          providerEventId: result.providerEventId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { status: 'ALREADY_PROCESSED' as const };
      }
      throw err;
    }

    if (result.status === 'CONFIRMED') {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
      await this.confirmBooking(payment.bookingId);
      await this.events.publish({ type: 'PaymentConfirmed', payload: { bookingId: payment.bookingId } });
    } else {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: result.eventType } });
      await this.bookings.applyEvent(payment.bookingId, BookingEvent.PAYMENT_FAILED);
      await this.events.publish({ type: 'PaymentFailed', payload: { bookingId: payment.bookingId } });
    }
    return { status: result.status };
  }

  /** Admin verifies a manual bank transfer (US-34). Idempotent via a synthetic event id. */
  async confirmManualTransfer(adminId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, bookingId: true, status: true },
    });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
    if (payment.status === 'CONFIRMED') return { status: 'ALREADY_CONFIRMED' as const };

    try {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: 'manual_confirm',
          payload: { by: adminId } as Prisma.InputJsonValue,
          providerEventId: `manual-${payment.id}`,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { status: 'ALREADY_PROCESSED' as const };
      }
      throw err;
    }

    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'PAYMENT_MANUAL_VERIFIED', targetType: 'Payment', targetId: payment.id },
    });
    await this.confirmBooking(payment.bookingId);
    await this.events.publish({ type: 'PaymentConfirmed', payload: { bookingId: payment.bookingId } });
    return { status: 'CONFIRMED' as const };
  }

  /** Route the booking after confirmed payment based on the listing's booking model. */
  private async confirmBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { listing: { select: { bookingModel: true } } },
    });
    const event =
      booking?.listing.bookingModel === 'INSTANT'
        ? BookingEvent.PAYMENT_CONFIRMED_INSTANT
        : BookingEvent.PAYMENT_CONFIRMED_REQUEST;
    await this.bookings.applyEvent(bookingId, event);
  }
}
