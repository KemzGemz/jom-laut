import { today } from './dates';
import type { Booking } from './types';

export type BookingStage = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** What the customer sees; "completed" is a confirmed booking whose date has passed. */
export function stageOf(b: Booking): BookingStage {
  if (b.status === 'CANCELLED') return 'cancelled';
  if (b.status === 'PENDING_APPROVAL') return 'pending';
  return b.date < today() ? 'completed' : 'confirmed';
}

export const STAGE_LABELS: Record<BookingStage, string> = {
  pending: 'Awaiting operator',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
