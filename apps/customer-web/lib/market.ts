/**
 * The live marketplace: the sample catalogue plus everything customers and
 * operators have changed in this browser (bookings, blocked dates, listing edits).
 * Pure functions, so both sides of the marketplace work from the same rules.
 */
import { addDays, daysBetween, today, type ISODate } from './dates';
import { quote } from './pricing';
import { allTrips, getTrip as baseTrip, inBookingWindow, isRestDay, sampleSlot } from './repo';
import type { Booking, Trip } from './types';

export interface MarketState {
  bookings: Booking[];
  /** Dates an operator closed, by listing id. */
  blocked: Record<string, ISODate[]>;
  /** Listings an operator edited or created, by listing id. */
  listings: Record<string, Trip>;
  /** Operator decisions on sample bookings, by booking reference. */
  overrides: Record<string, Partial<Booking>>;
}

export const EMPTY_MARKET: MarketState = { bookings: [], blocked: {}, listings: {}, overrides: {} };

/** What the operator keeps: the boat price less this commission. The customer's service fee is separate. */
export const COMMISSION_PCT = 10;

export function catalogue(state: MarketState): Trip[] {
  const base = allTrips();
  const ids = new Set(base.map((t) => t.id));
  return [...base.map((t) => state.listings[t.id] ?? t), ...Object.values(state.listings).filter((t) => !ids.has(t.id))];
}

const CUSTOMERS = ['Amir Hakim', 'Jason Lim', 'Siti Aminah', 'Raj Kumar', 'Farid Ismail', 'Chong Wei', 'Nadia Rahman', 'Daniel Tan', 'Hakimi Zain', 'Priya Nair', 'Azlan Shah', 'Marcus Lee'];
const NOTES = ['', '', '', 'Two first-timers in the group.', 'We would like to target tenggiri if possible.', 'Bringing our own rods.', 'One child, aged 10.', ''];
const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function sampleRef(h: number): string {
  let n = h;
  let ref = 'AX-';
  for (let i = 0; i < 6; i += 1) {
    ref += REF_CHARS[n % 32];
    n = Math.floor(n / 32) + 7;
  }
  return ref;
}

/** Bookings from other customers on a catalogue listing: the sample demand behind "taken" departures. */
export function sampleBookings(trip: Trip, from: ISODate, to: ISODate, now: ISODate = today()): Booking[] {
  const base = baseTrip(trip.id);
  if (!base) return [];
  const q = quote(base);
  const out: Booking[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    base.departureTimes.forEach((time, slot) => {
      const h = sampleSlot(base, date, slot);
      if (h === null) return;
      const name = CUSTOMERS[(h >> 10) % CUSTOMERS.length]!;
      const daysAway = daysBetween(now, date);
      const pending = !base.instantBooking && daysAway > 0 && daysAway <= 30 && (h >> 3) % 3 === 0;
      const deposit = base.depositPct > 0 && (h >> 5) % 2 === 0 && daysAway > 3;
      const created = pending ? addDays(now, -((h >> 8) % 2)) : addDays(date, -(3 + ((h >> 8) % 20)));
      out.push({
        ref: sampleRef(h),
        tripId: trip.id,
        userEmail: `${name.split(' ')[0]!.toLowerCase()}@example.com`,
        date,
        time,
        anglers: 1 + ((h >> 7) % base.maxAnglers),
        organiserName: name,
        organiserPhone: `01${(h >> 4) % 10}-${1000000 + ((h >> 2) % 8999999)}`,
        notes: NOTES[(h >> 6) % NOTES.length]!,
        priceSen: q.priceSen,
        serviceFeeSen: q.serviceFeeSen,
        totalSen: q.totalSen,
        paidSen: deposit ? q.depositSen : q.totalSen,
        payOption: deposit ? 'deposit' : 'full',
        method: (['fpx', 'card', 'ewallet'] as const)[(h >> 9) % 3]!,
        status: pending ? 'PENDING_APPROVAL' : 'CONFIRMED',
        createdAt: `${created}T09:00:00`,
      });
    });
  }
  return out;
}

/** Every booking on a listing between two dates: real ones made in this browser plus the sample demand. */
export function tripBookings(trip: Trip, state: MarketState, from: ISODate, to: ISODate, now: ISODate = today()): Booking[] {
  const samples = sampleBookings(trip, from, to, now).map((b) => ({ ...b, ...state.overrides[b.ref] }));
  const real = state.bookings.filter((b) => b.tripId === trip.id && b.date >= from && b.date <= to);
  return [...real, ...samples];
}

export function isBlocked(trip: Trip, date: ISODate, state: MarketState): boolean {
  return state.blocked[trip.id]?.includes(date) ?? false;
}

/** Departures a customer can still book on a date. */
export function openTimes(trip: Trip, date: ISODate, state: MarketState, now: ISODate = today()): string[] {
  if (trip.paused || !inBookingWindow(date, now) || isRestDay(trip, date) || isBlocked(trip, date, state)) return [];
  const taken = tripBookings(trip, state, date, date, now).filter((b) => b.status !== 'CANCELLED').map((b) => b.time);
  return trip.departureTimes.filter((t) => !taken.includes(t));
}

export interface Payout {
  grossSen: number;
  commissionSen: number;
  netSen: number;
}

export function payoutOf(b: Booking): Payout {
  const commissionSen = Math.round((b.priceSen * COMMISSION_PCT) / 100);
  return { grossSen: b.priceSen, commissionSen, netSen: b.priceSen - commissionSen };
}

export interface OperatorAccount {
  id: string;
  name: string;
  verified: boolean;
  home: string;
  listings: Trip[];
}

export function operators(trips: Trip[]): OperatorAccount[] {
  const map = new Map<string, OperatorAccount>();
  for (const t of trips) {
    const existing = map.get(t.operator.id);
    if (existing) existing.listings.push(t);
    else map.set(t.operator.id, { id: t.operator.id, name: t.operator.name, verified: t.operator.verified, home: `${t.jetty}, ${t.state}`, listings: [t] });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
