'use client';

/**
 * Browser-side session: who is signed in, their wishlist and their bookings.
 * Everything persists to localStorage so the prototype survives reloads; the
 * shape mirrors what the auth and bookings APIs will return.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ISODate } from './dates';
import { EMPTY_MARKET, type MarketState } from './market';
import type { Booking, OperatorProfile, Trip, User } from './types';

interface Persisted extends MarketState {
  user: User | null;
  wishlist: string[];
  /** The operator account this browser is using, if any. */
  operatorId: string | null;
}

interface Store extends Persisted {
  /** False until localStorage has been read; render neutral UI until then. */
  ready: boolean;
  /** True once a save did not fit in the browser's storage, so later changes may not survive a reload. */
  storageFull: boolean;
  login: (email: string, name?: string) => void;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;
  toggleWishlist: (tripId: string) => void;
  addBooking: (booking: Booking) => void;
  /** Also accepts the reference of a sample booking, whose changes are kept as an override. */
  updateBooking: (ref: string, patch: Partial<Booking>) => void;
  setOperator: (id: string | null) => void;
  setBlocked: (tripIds: string[], date: ISODate, blocked: boolean) => void;
  saveListing: (trip: Trip) => void;
  /** Registers an operator and signs this browser in as them. */
  addAccount: (profile: OperatorProfile) => void;
}

const KEY = 'anglex.session.v1';
const EMPTY: Persisted = { ...EMPTY_MARKET, user: null, wishlist: [], operatorId: null };
const StoreContext = createContext<Store | undefined>(undefined);

function titleCase(s: string): string {
  return s.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) });
    } catch {
      /* unreadable storage: start with an empty session */
    }
    setReady(true);
  }, []);

  const commit = useCallback((update: (prev: Persisted) => Persisted) => {
    setState((prev) => {
      const next = update(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage full or blocked: keep the in-memory session */
        setStorageFull(true);
      }
      return next;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
      storageFull,
      login: (email, name) =>
        commit((s) => ({ ...s, user: { email, name: name?.trim() || titleCase(email.split('@')[0] ?? 'Angler') } })),
      logout: () => commit((s) => ({ ...s, user: null })),
      updateProfile: (patch) => commit((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s)),
      toggleWishlist: (tripId) =>
        commit((s) => ({
          ...s,
          wishlist: s.wishlist.includes(tripId) ? s.wishlist.filter((id) => id !== tripId) : [...s.wishlist, tripId],
        })),
      addBooking: (booking) => commit((s) => ({ ...s, bookings: [booking, ...s.bookings] })),
      updateBooking: (ref, patch) =>
        commit((s) =>
          s.bookings.some((b) => b.ref === ref)
            ? { ...s, bookings: s.bookings.map((b) => (b.ref === ref ? { ...b, ...patch } : b)) }
            : { ...s, overrides: { ...s.overrides, [ref]: { ...s.overrides[ref], ...patch } } },
        ),
      setOperator: (operatorId) => commit((s) => ({ ...s, operatorId })),
      setBlocked: (tripIds, date, blocked) =>
        commit((s) => {
          const next = { ...s.blocked };
          for (const id of tripIds) {
            const others = (next[id] ?? []).filter((d) => d !== date);
            next[id] = blocked ? [...others, date] : others;
          }
          return { ...s, blocked: next };
        }),
      saveListing: (trip) => commit((s) => ({ ...s, listings: { ...s.listings, [trip.id]: trip } })),
      addAccount: (profile) => commit((s) => ({ ...s, accounts: { ...s.accounts, [profile.id]: profile }, operatorId: profile.id })),
    }),
    [state, ready, storageFull, commit],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

/** Only allow same-site redirect targets. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
