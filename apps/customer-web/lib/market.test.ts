import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { catalogue, EMPTY_MARKET, openTimes, operators, payoutOf, sampleBookings, tripBookings, type MarketState } from './market';
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

  it('pays the operator the boat price less commission', () => {
    expect(payoutOf(booking(instant, addDays(now, 5)))).toEqual({ grossSen: 95000, commissionSen: 9500, netSen: 85500 });
  });
});
