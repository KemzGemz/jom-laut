'use client';

import Link from 'next/link';
import { formatDate, type ISODate } from '@/lib/dates';
import { useMarket } from '@/lib/live';
import { formatMyr } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import { TRIP_TYPE_LABELS, type Trip } from '@/lib/types';
import { Icon } from './Icon';

export function WishlistButton({ tripId, className = '' }: { tripId: string; className?: string }) {
  const { wishlist, toggleWishlist } = useStore();
  const saved = wishlist.includes(tripId);
  return (
    <button
      type="button"
      className={`heart${saved ? ' saved' : ''} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(tripId); }}
    >
      <Icon name="heart" size={20} filled={saved} />
    </button>
  );
}

/** Photo that degrades to a branded placeholder if the image host is unreachable. */
export function TripPhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={(e) => { e.currentTarget.classList.add('img-failed'); e.currentTarget.removeAttribute('src'); }}
    />
  );
}

export function tripHref(trip: Trip, date?: ISODate, anglers?: number): string {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (anglers) params.set('anglers', String(anglers));
  const qs = params.toString();
  return `/trips/${trip.id}${qs ? `?${qs}` : ''}`;
}

/** Star rating, or "New" for a listing nobody has reviewed yet. */
export function Rating({ trip, size = 13, count = true }: { trip: Trip; size?: number; count?: boolean }) {
  if (trip.reviewsCount === 0) return <span className="rating">New</span>;
  return (
    <span className="rating">
      <Icon name="star" size={size} filled /> {trip.rating.toFixed(2)} {count && <span className="muted">({trip.reviewsCount})</span>}
    </span>
  );
}

export function TripNotFound() {
  return (
    <div className="container page narrow">
      <div className="empty">
        <Icon name="fish" size={32} />
        <h1>Trip not found</h1>
        <p className="muted">This listing may have been removed, or the link is out of date.</p>
        <Link className="btn btn-primary" href="/search">Browse trips</Link>
      </div>
    </div>
  );
}

export function TripCard({ trip: listed, date, anglers }: { trip: Trip; date?: ISODate; anglers?: number }) {
  // The operator may have edited, paused or closed this listing since the page was rendered.
  const market = useMarket();
  const trip = market.getTrip(listed.id) ?? listed;
  if (market.ready && (trip.paused || (date && !market.isOpen(trip, date)))) return null;
  return (
    <Link className="trip-card" href={tripHref(trip, date, anglers)}>
      <div className="media">
        <TripPhoto src={trip.images[0]!} alt="" />
        {trip.instantBooking && <span className="badge"><Icon name="bolt" size={12} filled /> Instant book</span>}
        <WishlistButton tripId={trip.id} />
      </div>
      <div className="card-top">
        <span className="card-place">{trip.district}, {trip.state}</span>
        <Rating trip={trip} />
      </div>
      <div className="card-title">{trip.title}</div>
      <div className="muted card-meta">
        {TRIP_TYPE_LABELS[trip.tripType]} · {trip.durationHours}h · up to {trip.maxAnglers} anglers
      </div>
      {date && <div className="card-date"><Icon name="calendar" size={13} /> Available {formatDate(date)}</div>}
      <div className="card-price">
        <strong>{formatMyr(trip.priceSen)}</strong> per boat
        <span className="muted"> · about {formatMyr(Math.ceil(trip.priceSen / trip.maxAnglers / 100) * 100)} each</span>
      </div>
    </Link>
  );
}
