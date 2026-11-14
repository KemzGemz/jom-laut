import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BookingStatus } from '@jom-laut/shared-types';
import {
  BookingEvent,
  transition,
  canTransition,
  nextStatus,
  isTerminal,
  InvalidTransitionError,
} from '../src/booking/state-machine';

const allStatuses = Object.values(BookingStatus);
const allEvents = Object.values(BookingEvent);

describe('Booking state machine — example-based', () => {
  it('happy path: instant booking', () => {
    let s: BookingStatus = BookingStatus.DRAFT;
    s = transition(s, BookingEvent.HOLD_SLOT);
    expect(s).toBe(BookingStatus.SLOT_HELD);
    s = transition(s, BookingEvent.PROCEED_TO_PAYMENT);
    s = transition(s, BookingEvent.PAYMENT_PROCESSING);
    s = transition(s, BookingEvent.PAYMENT_CONFIRMED_INSTANT);
    expect(s).toBe(BookingStatus.CONFIRMED);
    s = transition(s, BookingEvent.MARK_COMPLETED);
    expect(s).toBe(BookingStatus.COMPLETED);
  });

  it('request-to-book path routes through operator approval', () => {
    let s = transition(BookingStatus.PAYMENT_PROCESSING, BookingEvent.PAYMENT_CONFIRMED_REQUEST);
    expect(s).toBe(BookingStatus.PENDING_OPERATOR_APPROVAL);
    s = transition(s, BookingEvent.OPERATOR_ACCEPT);
    expect(s).toBe(BookingStatus.CONFIRMED);
  });

  it('rejects a client trying to jump straight to CONFIRMED', () => {
    expect(() => transition(BookingStatus.DRAFT, BookingEvent.PAYMENT_CONFIRMED_INSTANT)).toThrow(
      InvalidTransitionError,
    );
  });
});

describe('Booking state machine — property-based (PBT-06 stateful)', () => {
  it('a random walk of only-valid events never throws and never leaves terminal states', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...allEvents), { maxLength: 30 }), (events) => {
        let s: BookingStatus = BookingStatus.DRAFT;
        for (const e of events) {
          if (canTransition(s, e)) {
            const before = s;
            s = transition(s, e);
            // once terminal, no transition should have been possible
            expect(isTerminal(before)).toBe(false);
          } else {
            expect(() => transition(s, e)).toThrow(InvalidTransitionError);
          }
        }
      }),
    );
  });

  it('terminal states allow no events', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        fc.constantFrom(...allEvents),
        (status, event) => {
          if (isTerminal(status)) {
            expect(canTransition(status, event)).toBe(false);
          }
        },
      ),
    );
  });

  it('nextStatus is deterministic and consistent with canTransition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        fc.constantFrom(...allEvents),
        (status, event) => {
          expect(canTransition(status, event)).toBe(nextStatus(status, event) !== undefined);
        },
      ),
    );
  });
});
