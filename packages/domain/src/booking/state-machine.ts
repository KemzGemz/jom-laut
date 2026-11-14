import { BookingStatus } from '@jom-laut/shared-types';

/**
 * Booking state machine (FR-BOOK-4, US-13/US-23/US-24).
 * The backend is the only component allowed to transition bookings.
 * Clients may never set status directly.
 */

export const BookingEvent = {
  HOLD_SLOT: 'HOLD_SLOT',
  PROCEED_TO_PAYMENT: 'PROCEED_TO_PAYMENT',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PAYMENT_CONFIRMED_INSTANT: 'PAYMENT_CONFIRMED_INSTANT',
  PAYMENT_CONFIRMED_REQUEST: 'PAYMENT_CONFIRMED_REQUEST',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  OPERATOR_ACCEPT: 'OPERATOR_ACCEPT',
  OPERATOR_REJECT: 'OPERATOR_REJECT',
  REQUEST_CANCELLATION: 'REQUEST_CANCELLATION',
  CONFIRM_CANCELLATION: 'CONFIRM_CANCELLATION',
  START_REFUND: 'START_REFUND',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  MARK_COMPLETED: 'MARK_COMPLETED',
  MARK_NO_SHOW: 'MARK_NO_SHOW',
  EXPIRE: 'EXPIRE',
} as const;
export type BookingEvent = (typeof BookingEvent)[keyof typeof BookingEvent];

type Transition = { from: BookingStatus; event: BookingEvent; to: BookingStatus };

const TRANSITIONS: readonly Transition[] = [
  { from: BookingStatus.DRAFT, event: BookingEvent.HOLD_SLOT, to: BookingStatus.SLOT_HELD },
  { from: BookingStatus.SLOT_HELD, event: BookingEvent.PROCEED_TO_PAYMENT, to: BookingStatus.PENDING_PAYMENT },
  { from: BookingStatus.SLOT_HELD, event: BookingEvent.EXPIRE, to: BookingStatus.EXPIRED },
  { from: BookingStatus.PENDING_PAYMENT, event: BookingEvent.PAYMENT_PROCESSING, to: BookingStatus.PAYMENT_PROCESSING },
  { from: BookingStatus.PENDING_PAYMENT, event: BookingEvent.EXPIRE, to: BookingStatus.EXPIRED },
  { from: BookingStatus.PAYMENT_PROCESSING, event: BookingEvent.PAYMENT_CONFIRMED_INSTANT, to: BookingStatus.CONFIRMED },
  { from: BookingStatus.PAYMENT_PROCESSING, event: BookingEvent.PAYMENT_CONFIRMED_REQUEST, to: BookingStatus.PENDING_OPERATOR_APPROVAL },
  { from: BookingStatus.PAYMENT_PROCESSING, event: BookingEvent.PAYMENT_FAILED, to: BookingStatus.PENDING_PAYMENT },
  { from: BookingStatus.PENDING_OPERATOR_APPROVAL, event: BookingEvent.OPERATOR_ACCEPT, to: BookingStatus.CONFIRMED },
  { from: BookingStatus.PENDING_OPERATOR_APPROVAL, event: BookingEvent.OPERATOR_REJECT, to: BookingStatus.REJECTED },
  // Cancellation flow (allowed from active pre-trip states and confirmed)
  { from: BookingStatus.PENDING_OPERATOR_APPROVAL, event: BookingEvent.REQUEST_CANCELLATION, to: BookingStatus.CANCELLATION_REQUESTED },
  { from: BookingStatus.CONFIRMED, event: BookingEvent.REQUEST_CANCELLATION, to: BookingStatus.CANCELLATION_REQUESTED },
  { from: BookingStatus.CANCELLATION_REQUESTED, event: BookingEvent.CONFIRM_CANCELLATION, to: BookingStatus.CANCELLED },
  // Refund flow
  { from: BookingStatus.CANCELLED, event: BookingEvent.START_REFUND, to: BookingStatus.REFUND_PENDING },
  { from: BookingStatus.REJECTED, event: BookingEvent.START_REFUND, to: BookingStatus.REFUND_PENDING },
  { from: BookingStatus.REFUND_PENDING, event: BookingEvent.REFUND_COMPLETED, to: BookingStatus.REFUNDED },
  // Trip outcomes
  { from: BookingStatus.CONFIRMED, event: BookingEvent.MARK_COMPLETED, to: BookingStatus.COMPLETED },
  { from: BookingStatus.CONFIRMED, event: BookingEvent.MARK_NO_SHOW, to: BookingStatus.NO_SHOW },
];

/** Terminal states that accept no further transitions. */
export const TERMINAL_STATES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.REFUNDED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
  BookingStatus.EXPIRED,
]);

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly event: BookingEvent,
  ) {
    super(`Invalid booking transition: cannot apply "${event}" from state "${from}"`);
    this.name = 'InvalidTransitionError';
  }
}

/** Look up the resulting status for a (from, event) pair, or undefined if not allowed. */
export function nextStatus(from: BookingStatus, event: BookingEvent): BookingStatus | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.event === event)?.to;
}

export function canTransition(from: BookingStatus, event: BookingEvent): boolean {
  return nextStatus(from, event) !== undefined;
}

/** Apply a transition, throwing InvalidTransitionError if not permitted (fail-closed). */
export function transition(from: BookingStatus, event: BookingEvent): BookingStatus {
  const to = nextStatus(from, event);
  if (to === undefined) {
    throw new InvalidTransitionError(from, event);
  }
  return to;
}

export function isTerminal(status: BookingStatus): boolean {
  return TERMINAL_STATES.has(status);
}

/** All events valid from a given state (useful for UIs and tests). */
export function allowedEvents(from: BookingStatus): BookingEvent[] {
  return TRANSITIONS.filter((t) => t.from === from).map((t) => t.event);
}
