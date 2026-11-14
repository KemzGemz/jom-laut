/**
 * The catalogue's single entry point. Pages and components read trips only through
 * these functions, so swapping the sample data for the real listings API is a
 * change to this file alone.
 */
import { addDays, dayNumber, today, type ISODate } from './dates';
import { POPULAR_TRIP_IDS, TRIPS } from './trips';
import type { SearchQuery, Trip } from './types';

export const BOOKING_WINDOW_DAYS = 120;

export function allTrips(): Trip[] {
  return TRIPS;
}

export function getTrip(id: string): Trip | undefined {
  return TRIPS.find((t) => t.id === id);
}

export function popularTrips(): Trip[] {
  return POPULAR_TRIP_IDS.map(getTrip).filter((t): t is Trip => Boolean(t));
}

export interface LocationOption {
  state: string;
  district?: string;
  label: string;
  tripCount: number;
}

/** Every state and district that actually has trips, states first. */
export function locations(): LocationOption[] {
  const states = new Map<string, number>();
  const districts = new Map<string, LocationOption>();
  for (const t of TRIPS) {
    states.set(t.state, (states.get(t.state) ?? 0) + 1);
    const key = `${t.state}/${t.district}`;
    const existing = districts.get(key);
    if (existing) existing.tripCount += 1;
    else districts.set(key, { state: t.state, district: t.district, label: `${t.district}, ${t.state}`, tripCount: 1 });
  }
  const stateOptions: LocationOption[] = [...states].map(([state, tripCount]) => ({ state, label: state, tripCount }));
  return [...stateOptions, ...districts.values()].sort((a, b) => a.state.localeCompare(b.state) || (a.district ?? '').localeCompare(b.district ?? ''));
}

/** Small stable hash so availability looks organic but never changes between renders. */
function hash(a: number, b: number, c = 0): number {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return Math.abs(h ^ (h >>> 16));
}

/** Departure times still open on a date. Bookings open from tomorrow, up to the booking window. */
export function availableTimes(trip: Trip, date: ISODate, from: ISODate = today()): string[] {
  if (!inBookingWindow(date, from) || isRestDay(trip, date)) return [];
  return trip.departureTimes.filter((_, slot) => sampleSlot(trip, date, slot) === null);
}

export function inBookingWindow(date: ISODate, from: ISODate = today()): boolean {
  return date > from && date <= addDays(from, BOOKING_WINDOW_DAYS);
}

/** The operator's weekly day off. Listings created by an operator (seed 0) have none. */
export function isRestDay(trip: Trip, date: ISODate): boolean {
  return trip.seed > 0 && (dayNumber(date) + trip.seed) % 7 === 2;
}

/**
 * Sample demand: about one departure in four is already taken by another customer.
 * Returns a stable number identifying that sample booking, or null if the slot is free.
 */
export function sampleSlot(trip: Trip, date: ISODate, slot: number): number | null {
  if (trip.seed <= 0 || isRestDay(trip, date)) return null;
  const h = hash(trip.seed, dayNumber(date), slot);
  return h % 4 === 0 ? h : null;
}

export function isAvailable(trip: Trip, date: ISODate): boolean {
  return availableTimes(trip, date).length > 0;
}

/** `source` lets the browser search the live catalogue (operator edits, blocked dates, new bookings). */
export function searchTrips(
  q: SearchQuery,
  source: { trips: Trip[]; isOpen: (trip: Trip, date: ISODate) => boolean } = { trips: TRIPS, isOpen: isAvailable },
): Trip[] {
  const results = source.trips.filter((t) => {
    if (t.paused) return false;
    if (q.state && t.state !== q.state) return false;
    if (q.district && t.district !== q.district) return false;
    if (q.date && !source.isOpen(t, q.date)) return false;
    if (q.anglers && t.maxAnglers < q.anglers) return false;
    if (q.types?.length && !q.types.includes(t.tripType)) return false;
    if (q.instantOnly && !t.instantBooking) return false;
    if (q.bathroomOnly && !t.hasBathroom) return false;
    if (q.maxPriceSen !== undefined && t.priceSen > q.maxPriceSen) return false;
    if (q.minBoatFt && t.boatSizeFt < q.minBoatFt) return false;
    return true;
  });

  const score = (t: Trip) => t.rating * Math.log10(t.reviewsCount + 10);
  return results.sort((a, b) => {
    switch (q.sort) {
      case 'price_asc': return a.priceSen - b.priceSen;
      case 'price_desc': return b.priceSen - a.priceSen;
      case 'rating': return b.rating - a.rating || b.reviewsCount - a.reviewsCount;
      case 'boat_size': return b.boatSizeFt - a.boatSizeFt;
      default: return score(b) - score(a);
    }
  });
}

export const PRICE_CEILING_SEN = Math.max(...TRIPS.map((t) => t.priceSen));
