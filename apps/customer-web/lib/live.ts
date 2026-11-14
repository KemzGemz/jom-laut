'use client';

import { useMemo } from 'react';
import { addDays, today, type ISODate } from './dates';
import { catalogue, openTimes, operators, tripBookings, type MarketState, type OperatorAccount } from './market';
import { BOOKING_WINDOW_DAYS } from './repo';
import { useStore } from './store';
import type { Booking, Trip } from './types';

/** How far back the operator's records go. */
export const HISTORY_DAYS = 90;

/** The catalogue and availability as they stand in this browser, for both customers and operators. */
export function useMarket() {
  const { bookings, blocked, listings, overrides, accounts, ready } = useStore();
  return useMemo(() => {
    const state: MarketState = { bookings, blocked, listings, overrides, accounts };
    const trips = catalogue(state);
    const byId = new Map(trips.map((t) => [t.id, t]));
    const times = (trip: Trip, date: ISODate) => openTimes(trip, date, state);
    return {
      ready,
      state,
      trips,
      getTrip: (id: string): Trip | undefined => byId.get(id),
      openTimes: times,
      isOpen: (trip: Trip, date: ISODate) => times(trip, date).length > 0,
    };
  }, [bookings, blocked, listings, overrides, accounts, ready]);
}

export interface OperatorBooking extends Booking {
  trip: Trip;
}

/** The signed-in operator's account, listings and every booking on them. */
export function useOperator(): { ready: boolean; account: OperatorAccount | undefined; listings: Trip[]; bookings: OperatorBooking[] } {
  const { operatorId } = useStore();
  const market = useMarket();
  return useMemo(() => {
    const account = operators(market.trips, market.state.accounts).find((o) => o.id === operatorId);
    const listings = account?.listings ?? [];
    const now = today();
    const bookings = listings
      .flatMap((trip) => tripBookings(trip, market.state, addDays(now, -HISTORY_DAYS), addDays(now, BOOKING_WINDOW_DAYS), now).map((b) => ({ ...b, trip })))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return { ready: market.ready, account, listings, bookings };
  }, [market, operatorId]);
}
