import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { computeCommission } from '@jom-laut/domain';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EventBus } from '../../platform/events/event-bus.js';

const DEFAULT_COMMISSION_BPS = 1500; // 15% fallback if no PlatformFee configured

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  /** Admin configures platform fees (US-31). Audited; applies to future commission calc. */
  async setPlatformFee(adminId: string, commissionBasisPoints: number, customerFeeSen = 0) {
    const fee = await this.prisma.platformFee.create({
      data: { commissionBasisPoints, customerFeeSen, createdBy: adminId },
      select: { id: true, commissionBasisPoints: true, customerFeeSen: true, effectiveFrom: true },
    });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'PLATFORM_FEE_SET', targetType: 'PlatformFee', targetId: fee.id, newValue: fee },
    });
    return fee;
  }

  private async currentCommissionBps(): Promise<number> {
    const fee = await this.prisma.platformFee.findFirst({ orderBy: { effectiveFrom: 'desc' }, select: { commissionBasisPoints: true } });
    return fee?.commissionBasisPoints ?? DEFAULT_COMMISSION_BPS;
  }

  /** Operator earnings view (US-25). Scoped to the operator (member) or admin. */
  async getEarnings(requester: { sub: string; role: string }, operatorId: string) {
    await this.assertOperatorAccess(requester, operatorId);
    const bps = await this.currentCommissionBps();

    const completed = await this.prisma.booking.findMany({
      where: { listing: { operatorId }, status: 'COMPLETED' },
      select: { id: true, totalSen: true },
    });

    let gross = 0;
    let commission = 0;
    let net = 0;
    for (const b of completed) {
      const paid = await this.paidMinusRefund(b.id);
      const breakdown = computeCommission({ grossSen: paid.gross as never, commissionBasisPoints: bps, refundSen: paid.refund as never });
      gross += breakdown.commissionableSen;
      commission += breakdown.commissionSen;
      net += breakdown.netToOperatorSen;
    }
    return { operatorId, completedBookings: completed.length, grossSen: gross, commissionSen: commission, netToOperatorSen: net };
  }

  /** Admin creates a manual payout for completed bookings (US-33). */
  async createPayout(adminId: string, operatorId: string, bookingIds: string[]) {
    const bps = await this.currentCommissionBps();
    let totalNet = 0;
    const items: { bookingId: string; netSen: number }[] = [];

    for (const bookingId of bookingIds) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, listing: { select: { operatorId: true } } },
      });
      if (!booking || booking.listing.operatorId !== operatorId) {
        throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking ${bookingId} not found for operator` });
      }
      const paid = await this.paidMinusRefund(bookingId);
      const breakdown = computeCommission({ grossSen: paid.gross as never, commissionBasisPoints: bps, refundSen: paid.refund as never });
      await this.prisma.commission.upsert({
        where: { bookingId },
        create: {
          bookingId,
          grossSen: breakdown.grossSen,
          refundSen: breakdown.refundSen,
          commissionSen: breakdown.commissionSen,
          netToOperatorSen: breakdown.netToOperatorSen,
        },
        update: {
          grossSen: breakdown.grossSen,
          refundSen: breakdown.refundSen,
          commissionSen: breakdown.commissionSen,
          netToOperatorSen: breakdown.netToOperatorSen,
        },
      });
      items.push({ bookingId, netSen: breakdown.netToOperatorSen });
      totalNet += breakdown.netToOperatorSen;
    }

    const payout = await this.prisma.operatorPayout.create({
      data: {
        operatorId,
        status: 'PENDING',
        totalNetSen: totalNet,
        items: { create: items },
      },
      select: { id: true, totalNetSen: true, status: true },
    });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'PAYOUT_CREATED', targetType: 'OperatorPayout', targetId: payout.id },
    });
    return payout;
  }

  /** Admin marks a payout completed (US-33). */
  async markPayoutCompleted(adminId: string, payoutId: string, reference: string) {
    const payout = await this.prisma.operatorPayout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', reference, paidAt: new Date() },
      select: { id: true, operatorId: true, status: true },
    });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'PAYOUT_COMPLETED', targetType: 'OperatorPayout', targetId: payout.id, reason: reference },
    });
    await this.events.publish({ type: 'PayoutCompleted', payload: { payoutId: payout.id, operatorId: payout.operatorId } });
    return payout;
  }

  private async paidMinusRefund(bookingId: string): Promise<{ gross: number; refund: number }> {
    const [paidAgg, refundAgg] = await Promise.all([
      this.prisma.payment.aggregate({ where: { bookingId, status: 'CONFIRMED' }, _sum: { amountSen: true } }),
      this.prisma.refund.aggregate({ where: { bookingId, status: 'COMPLETED' }, _sum: { amountSen: true } }),
    ]);
    return { gross: paidAgg._sum.amountSen ?? 0, refund: refundAgg._sum.amountSen ?? 0 };
  }

  private async assertOperatorAccess(requester: { sub: string; role: string }, operatorId: string): Promise<void> {
    if (requester.role === 'ADMIN') return;
    const membership = await this.prisma.operatorMember.findFirst({
      where: { operatorId, userId: requester.sub },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not permitted for this operator' });
  }
}
