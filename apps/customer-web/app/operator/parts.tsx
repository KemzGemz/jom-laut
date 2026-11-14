'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { stageOf, type BookingStage } from '@/lib/bookings';
import { formatDate, formatTime } from '@/lib/dates';
import type { OperatorBooking } from '@/lib/live';
import { payoutOf } from '@/lib/market';
import { formatMyr } from '@/lib/pricing';
import { useStore } from '@/lib/store';

/** The same stages the customer sees, in the operator's words. */
export const OP_STAGE_LABELS: Record<BookingStage, string> = {
  pending: 'Needs your reply',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function anglersLabel(n: number): string {
  return `${n} angler${n === 1 ? '' : 's'}`;
}

/** Accepting and declining, shared by the overview, the bookings list and the booking page. */
export function useBookingActions() {
  const { updateBooking } = useStore();
  return {
    accept: (b: OperatorBooking) => updateBooking(b.ref, { status: 'CONFIRMED' }),
    /** A request that is declined was never charged; a confirmed trip the operator cancels is refunded in full. */
    cancel: (b: OperatorBooking, reason: string) =>
      updateBooking(b.ref, {
        status: 'CANCELLED',
        cancelledBy: 'operator',
        cancelReason: reason.trim(),
        cancelledAt: new Date().toISOString(),
        refundSen: b.status === 'PENDING_APPROVAL' ? 0 : b.paidSen,
        paidSen: b.status === 'PENDING_APPROVAL' ? 0 : b.paidSen,
      }),
  };
}

export function BookingRow({ booking: b, showStatus = true }: { booking: OperatorBooking; showStatus?: boolean }) {
  const stage = stageOf(b);
  return (
    <li>
      <Link href={`/operator/bookings/${b.ref}`} className="op-row">
        <div className="op-row-date">
          <strong>{formatDate(b.date)}</strong>
          <span className="muted small">{formatTime(b.time)}</span>
        </div>
        <div className="op-row-main">
          <strong>{b.organiserName} · {anglersLabel(b.anglers)}</strong>
          <span className="muted small">{b.trip.title}</span>
        </div>
        <div className="op-row-end">
          {showStatus && <span className={`status ${stage}`}>{OP_STAGE_LABELS[stage]}</span>}
          <span className="small">{stage === 'cancelled' ? 'No payout' : formatMyr(payoutOf(b).netSen)}</span>
        </div>
        <Icon name="right" />
      </Link>
    </li>
  );
}
