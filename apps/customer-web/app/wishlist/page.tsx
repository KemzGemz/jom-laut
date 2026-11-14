'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { TripCard } from '@/components/TripCard';
import { getTrip } from '@/lib/repo';
import { useStore } from '@/lib/store';
import type { Trip } from '@/lib/types';

export default function WishlistPage() {
  const { wishlist, ready } = useStore();
  if (!ready) return <div className="container page muted">Loading…</div>;

  const trips = wishlist.map(getTrip).filter((t): t is Trip => Boolean(t));

  return (
    <div className="container page">
      <h1>Wishlist</h1>
      {trips.length === 0 ? (
        <div className="empty">
          <Icon name="heart" size={32} />
          <h2>Nothing saved yet</h2>
          <p className="muted">Tap the heart on any trip to keep it here while you compare boats and dates.</p>
          <Link className="btn btn-primary" href="/search">Browse trips</Link>
        </div>
      ) : (
        <div className="trip-grid four">
          {trips.map((t) => <TripCard key={t.id} trip={t} />)}
        </div>
      )}
    </div>
  );
}
