/**
 * The catalogue's single entry point. Pages and components read trips only through
 * these functions, so swapping the sample data for the real listings API is a
 * change to this file alone.
 */
import { addDays, dayNumber, today, type ISODate } from './dates';
import { POPULAR_TRIP_IDS, TRIPS } from './trips';
import type { SearchQuery, Trip } from './types';

export const BOOKING_WINDOW_DAYS = 120;

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
  if (date <= from || date > addDays(from, BOOKING_WINDOW_DAYS)) return [];
  const day = dayNumber(date);
  if ((day + trip.seed) % 7 === 2) return []; // the operator's weekly rest day
  return trip.departureTimes.filter((_, slot) => hash(trip.seed, day, slot) % 4 !== 0);
}

export function isAvailable(trip: Trip, date: ISODate): boolean {
  return availableTimes(trip, date).length > 0;
}

export function searchTrips(q: SearchQuery): Trip[] {
  const results = TRIPS.filter((t) => {
    if (q.state && t.state !== q.state) return false;
    if (q.district && t.district !== q.district) return false;
    if (q.date && !isAvailable(t, q.date)) return false;
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
