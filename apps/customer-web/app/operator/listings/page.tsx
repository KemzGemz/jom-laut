'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { TripPhoto } from '@/components/TripCard';
import { stageOf } from '@/lib/bookings';
import { useOperator } from '@/lib/live';
import { formatMyr } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import { TRIP_TYPE_LABELS } from '@/lib/types';

export default function OperatorListings() {
  const { listings, bookings } = useOperator();
  const { saveListing } = useStore();

  return (
    <div className="container page narrow">
      <div className="row-between">
        <h1>Listings</h1>
        <Link className="btn btn-primary" href="/operator/listings/new"><Icon name="plus" size={16} /> New listing</Link>
      </div>

      {listings.length === 0 && <p className="muted op-intro">You have no listings yet. A listing is one trip anglers can book: a boat, a price and its departure times.</p>}
      <ul className="op-list op-listings">
        {listings.map((t) => {
          const upcoming = bookings.filter((b) => b.trip.id === t.id && ['pending', 'confirmed'].includes(stageOf(b))).length;
          return (
            <li key={t.id} className="op-listing">
              <TripPhoto src={t.images[0]!} alt="" />
              <div className="op-listing-main">
                <span className={`status ${t.paused ? 'completed' : 'confirmed'}`}>{t.paused ? 'Paused' : 'Live'}</span>
                <strong>{t.title}</strong>
                <span className="muted small">
                  {TRIP_TYPE_LABELS[t.tripType]} · {formatMyr(t.priceSen)} per boat · up to {t.maxAnglers} anglers · {t.instantBooking ? 'Instant book' : 'Request to book'}
                </span>
                <span className="muted small">{upcoming} upcoming booking{upcoming === 1 ? '' : 's'}</span>
                <div className="op-listing-actions">
                  <Link className="link" href={`/operator/listings/${t.id}`}>Edit</Link>
                  <Link className="link" href={`/trips/${t.id}`}>View as customer</Link>
                  <button className="link-btn" onClick={() => saveListing({ ...t, paused: !t.paused })}>{t.paused ? 'Resume' : 'Pause'}</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted small">Pausing hides a listing from search and stops new bookings. Bookings you already have are not affected.</p>
    </div>
  );
}
