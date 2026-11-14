import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { stageOf } from './bookings';
import { catalogue, EMPTY_MARKET, openTimes, operators, payoutOf, sampleBookings, starterListing, tripBookings, type MarketState } from './market';
import { quote } from './pricing';
import { allTrips, availableTimes, getTrip, searchTrips } from './repo';
import type { Booking, Trip } from './types';

const now = '2026-11-14';
const window30 = Array.from({ length: 30 }, (_, i) => addDays(now, i + 1));
const instant = getTrip('marang-1')!;
const onRequest = allTrips().find((t) => !t.instantBooking)!;

function firstOpen(trip: Trip, state: MarketState = EMPTY_MARKET): string {
  return window30.find((d) => openTimes(trip, d, state, now).length > 0)!;
}

function booking(trip: Trip, date: string, patch: Partial<Booking> = {}): Booking {
  const q = quote(trip);
  return {
    ref: 'AX-TEST01', tripId: trip.id, userEmail: 'me@example.com', date, time: trip.departureTimes[0]!, anglers: 2,
    organiserName: 'Me', organiserPhone: '012-3456789', notes: '', priceSen: q.priceSen, serviceFeeSen: q.serviceFeeSen,
    totalSen: q.totalSen, paidSen: q.totalSen, payOption: 'full', method: 'fpx', status: 'CONFIRMED', createdAt: `${now}T09:00:00`, ...patch,
  };
}

describe('market', () => {
  it('matches the sample availability when nothing has changed', () => {
    for (const t of allTrips()) {
      for (const d of window30) expect(openTimes(t, d, EMPTY_MARKET, now)).toEqual(availableTimes(t, d, now));
    }
  });

  it('has a sample booking behind every taken departure', () => {
    for (const t of allTrips()) {
      for (const d of window30.slice(0, 10)) {
        const taken = t.departureTimes.filter((time) => !availableTimes(t, d, now).includes(time));
        const booked = sampleBookings(t, d, d, now).map((b) => b.time);
        if (availableTimes(t, d, now).length > 0 || booked.length > 0) expect(booked).toEqual(taken);
      }
    }
  });

  it('gives sample bookings unique references and only pending requests on request-to-book trips', () => {
    const all = allTrips().flatMap((t) => sampleBookings(t, addDays(now, -90), addDays(now, 120), now));
    expect(new Set(all.map((b) => b.ref)).size).toBe(all.length);
    expect(all.filter((b) => b.status === 'PENDING_APPROVAL').every((b) => !getTrip(b.tripId)!.instantBooking && b.date > now)).toBe(true);
    expect(sampleBookings(onRequest, addDays(now, 1), addDays(now, 30), now).length).toBeGreaterThan(0);
  });

  it('takes a booked departure off sale and puts it back when cancelled', () => {
    const date = firstOpen(instant);
    const booked: MarketState = { ...EMPTY_MARKET, bookings: [booking(instant, date)] };
    expect(openTimes(instant, date, booked, now)).not.toContain(instant.departureTimes[0]);
    const cancelled: MarketState = { ...EMPTY_MARKET, bookings: [booking(instant, date, { status: 'CANCELLED' })] };
    expect(openTimes(instant, date, cancelled, now)).toContain(instant.departureTimes[0]);
  });

  it('closes dates the operator blocked and whole listings they paused', () => {
    const date = firstOpen(instant);
    expect(openTimes(instant, date, { ...EMPTY_MARKET, blocked: { [instant.id]: [date] } }, now)).toEqual([]);
    const paused = { ...instant, paused: true };
    const state: MarketState = { ...EMPTY_MARKET, listings: { [instant.id]: paused } };
    expect(openTimes(paused, date, state, now)).toEqual([]);
    const live = catalogue(state);
    expect(searchTrips({}, { trips: live, isOpen: () => true }).some((t) => t.id === instant.id)).toBe(false);
  });

  it('frees the date when the operator declines a sample request', () => {
    const request = allTrips().flatMap((t) => sampleBookings(t, addDays(now, 1), addDays(now, 30), now)).find((b) => b.status === 'PENDING_APPROVAL')!;
    const trip = getTrip(request.tripId)!;
    expect(openTimes(trip, request.date, EMPTY_MARKET, now)).not.toContain(request.time);
    const declined: MarketState = { ...EMPTY_MARKET, overrides: { [request.ref]: { status: 'CANCELLED' } } };
    expect(openTimes(trip, request.date, declined, now)).toContain(request.time);
    expect(tripBookings(trip, declined, request.date, request.date, now).find((b) => b.ref === request.ref)?.status).toBe('CANCELLED');
  });

  it('adds operator-created listings to the catalogue with every date open', () => {
    const created: Trip = { ...instant, id: 'kapas-anglers-new', seed: 0, title: 'A brand new trip', reviewsCount: 0 };
    const state: MarketState = { ...EMPTY_MARKET, listings: { [created.id]: created } };
    expect(catalogue(state)).toHaveLength(allTrips().length + 1);
    expect(window30.every((d) => openTimes(created, d, state, now).length === created.departureTimes.length)).toBe(true);
    expect(operators(catalogue(state)).find((o) => o.id === instant.operator.id)!.listings.map((t) => t.id)).toContain(created.id);
  });

  it('lists a newly registered operator before they have any listing, and attaches their first one', () => {
    const profile = { id: 'new-boat', name: 'New Boat Co.', contactName: 'Ali', phone: '012-3456789', state: 'Terengganu', district: 'Marang', jetty: 'Jeti Marang', boatName: 'Seri', boatSizeFt: 26 };
    const state: MarketState = { ...EMPTY_MARKET, accounts: { [profile.id]: profile } };
    const before = operators(catalogue(state), state.accounts).find((o) => o.id === profile.id)!;
    expect(before.listings).toEqual([]);
    expect(before.verified).toBe(false);

    const first: Trip = { ...starterListing(profile), id: 'new-boat-1', title: 'Our first trip out', priceSen: 60000 };
    const withListing: MarketState = { ...state, listings: { [first.id]: first } };
    const after = operators(catalogue(withListing), withListing.accounts).find((o) => o.id === profile.id)!;
    expect(after.listings.map((t) => t.id)).toEqual(['new-boat-1']);
    expect(searchTrips({ district: 'Marang' }, { trips: catalogue(withListing), isOpen: () => true }).some((t) => t.id === first.id)).toBe(true);
  });

  it('adds a customer review to the listing and its rating', () => {
    const reviewed = booking(instant, addDays(now, 3), { completedAt: `${now}T10:00:00`, review: { rating: 1, comment: 'Engine trouble, came back early.' } });
    expect(stageOf(reviewed)).toBe('completed');
    const trip = catalogue({ ...EMPTY_MARKET, bookings: [reviewed] }).find((t) => t.id === instant.id)!;
    expect(trip.reviewsCount).toBe(instant.reviewsCount + 1);
    expect(trip.reviews[0]).toMatchObject({ rating: 1, comment: 'Engine trouble, came back early.' });
    expect(trip.rating).toBeLessThan(instant.rating);
  });

  it('pays the operator the boat price less commission', () => {
    expect(payoutOf(booking(instant, addDays(now, 5)))).toEqual({ grossSen: 95000, commissionSen: 9500, netSen: 85500 });
  });
});
