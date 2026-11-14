import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatTime, fromISO, isISODate, toISO, upcomingWeekend } from './dates';
import { dueNow, formatMyr, quote, refundFor } from './pricing';
import { availableTimes, BOOKING_WINDOW_DAYS, getTrip, isAvailable, locations, searchTrips } from './repo';
import { TRIPS } from './trips';

describe('dates', () => {
  it('round-trips local dates without shifting a day', () => {
    expect(toISO(fromISO('2026-11-14'))).toBe('2026-11-14');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-11-14', '2026-11-21')).toBe(7);
  });

  it('rejects malformed dates', () => {
    expect(isISODate('2026-11-14')).toBe(true);
    expect(isISODate('14/11/2026')).toBe(false);
    expect(isISODate(null)).toBe(false);
  });

  it('formats departure times', () => {
    expect(formatTime('07:00')).toBe('7:00 am');
    expect(formatTime('18:30')).toBe('6:30 pm');
  });

  it('only offers weekend days after today', () => {
    expect(upcomingWeekend('2026-11-11')).toEqual(['2026-11-14', '2026-11-15']); // Wednesday
    expect(upcomingWeekend('2026-11-14')).toEqual(['2026-11-15']); // Saturday
    expect(upcomingWeekend('2026-11-15')).toEqual(['2026-11-21', '2026-11-22']); // Sunday
  });
});

describe('pricing', () => {
  it('shows sen only when there are any', () => {
    expect(formatMyr(45000)).toBe('RM450');
    expect(formatMyr(47250)).toBe('RM472.50');
    expect(formatMyr(157500)).toBe('RM1,575');
  });

  it('adds a 5% service fee and keeps everything in whole sen', () => {
    const q = quote(getTrip('marang-5')!); // RM450, pay in full
    expect(q).toEqual({ priceSen: 45000, serviceFeeSen: 2250, totalSen: 47250, depositSen: 47250 });
  });

  it('offers a 30% deposit on trips of RM1,000 and above', () => {
    const q = quote(getTrip('marang-4')!); // RM1,500
    expect(q.totalSen).toBe(157500);
    expect(q.depositSen).toBe(47250);
    expect(dueNow(q, 'deposit')).toBe(47250);
    expect(dueNow(q, 'full')).toBe(157500);
  });

  it('refunds according to the cancellation policy', () => {
    expect(refundFor('flexible', 2, 10000)).toBe(10000);
    expect(refundFor('flexible', 1, 10000)).toBe(0);
    expect(refundFor('moderate', 7, 10000)).toBe(10000);
    expect(refundFor('moderate', 3, 10000)).toBe(5000);
    expect(refundFor('moderate', 1, 10000)).toBe(0);
    expect(refundFor('strict', 14, 10000)).toBe(5000);
    expect(refundFor('strict', 13, 10000)).toBe(0);
  });
});

describe('catalogue', () => {
  const from = '2026-11-14';

  it('has unique ids and sane values on every trip', () => {
    expect(new Set(TRIPS.map((t) => t.id)).size).toBe(TRIPS.length);
    for (const t of TRIPS) {
      expect(t.priceSen).toBeGreaterThan(0);
      expect(Number.isInteger(t.priceSen)).toBe(true);
      expect(t.maxAnglers).toBeGreaterThan(0);
      expect(t.departureTimes.length).toBeGreaterThan(0);
      expect(t.images).toHaveLength(5);
      expect(t.rating).toBeLessThanOrEqual(5);
    }
  });

  it('never opens today, the past, or dates beyond the booking window', () => {
    for (const t of TRIPS) {
      expect(availableTimes(t, from, from)).toEqual([]);
      expect(availableTimes(t, addDays(from, -1), from)).toEqual([]);
      expect(availableTimes(t, addDays(from, BOOKING_WINDOW_DAYS + 1), from)).toEqual([]);
    }
  });

  it('gives every trip some open dates, and the same answer every time', () => {
    for (const t of TRIPS) {
      const open = Array.from({ length: 30 }, (_, i) => addDays(from, i + 1)).filter((d) => availableTimes(t, d, from).length > 0);
      expect(open.length).toBeGreaterThan(5);
      expect(availableTimes(t, open[0]!, from)).toEqual(availableTimes(t, open[0]!, from));
    }
  });

  it('only lists places that have trips', () => {
    for (const option of locations()) {
      expect(searchTrips({ state: option.state, district: option.district })).toHaveLength(option.tripCount);
    }
  });

  it('filters by place, capacity, type and price', () => {
    const marang = searchTrips({ state: 'Terengganu', district: 'Marang' });
    expect(marang.length).toBeGreaterThan(0);
    expect(marang.every((t) => t.district === 'Marang')).toBe(true);
    expect(searchTrips({ anglers: 8 }).every((t) => t.maxAnglers >= 8)).toBe(true);
    expect(searchTrips({ types: ['squid'] }).every((t) => t.tripType === 'squid')).toBe(true);
    expect(searchTrips({ maxPriceSen: 50000 }).every((t) => t.priceSen <= 50000)).toBe(true);
    expect(searchTrips({ instantOnly: true, bathroomOnly: true }).every((t) => t.instantBooking && t.hasBathroom)).toBe(true);
  });

  it('only returns trips that are free on the searched date', () => {
    const date = addDays(toISO(new Date()), 7);
    const results = searchTrips({ date });
    expect(results.every((t) => isAvailable(t, date))).toBe(true);
    expect(results.length).toBeLessThan(TRIPS.length);
  });

  it('sorts by price', () => {
    const prices = searchTrips({ sort: 'price_asc' }).map((t) => t.priceSen);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
