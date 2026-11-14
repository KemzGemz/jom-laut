'use client';

/**
 * Browser-side session: who is signed in, their wishlist and their bookings.
 * Everything persists to localStorage so the prototype survives reloads; the
 * shape mirrors what the auth and bookings APIs will return.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Booking, User } from './types';

interface Persisted {
  user: User | null;
  wishlist: string[];
  bookings: Booking[];
}

interface Store extends Persisted {
  /** False until localStorage has been read; render neutral UI until then. */
  ready: boolean;
  login: (email: string, name?: string) => void;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;
  toggleWishlist: (tripId: string) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (ref: string, patch: Partial<Booking>) => void;
}

const KEY = 'anglex.session.v1';
const EMPTY: Persisted = { user: null, wishlist: [], bookings: [] };
const StoreContext = createContext<Store | undefined>(undefined);

function titleCase(s: string): string {
  return s.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);

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
      }
      return next;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
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
        commit((s) => ({ ...s, bookings: s.bookings.map((b) => (b.ref === ref ? { ...b, ...patch } : b)) })),
    }),
    [state, ready, commit],
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
