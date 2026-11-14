'use client';

import { Icon } from '@/components/Icon';
import { Rating, TripNotFound, TripPhoto, WishlistButton } from '@/components/TripCard';
import { formatTime, type ISODate } from '@/lib/dates';
import { useMarket } from '@/lib/live';
import { POLICIES, WEATHER_PROMISE } from '@/lib/pricing';
import { TRIP_TYPE_LABELS, type Trip } from '@/lib/types';
import { BookingCard } from './BookingCard';

export function TripView({ id, base, initialDate, initialAnglers }: { id: string; base?: Trip; initialDate?: ISODate; initialAnglers?: number }) {
  // Operator edits and new listings live in the browser, so the listing is resolved here.
  const market = useMarket();
  const trip = market.getTrip(id) ?? base;
  if (!trip) return market.ready ? <TripNotFound /> : <div className="container page muted">Loading…</div>;

  const policy = POLICIES[trip.cancellation];
  const departs = trip.departureTimes.map(formatTime).join(' or ');

  return (
    <div className="container page trip-page">
      <header className="trip-head">
        <div>
          <h1>{trip.title}</h1>
          <p className="trip-sub">
            <Rating trip={trip} size={14} count={false} />
            {trip.reviewsCount > 0 && <a href="#reviews">{trip.reviewsCount} reviews</a>}
            <span>{trip.district}, {trip.state}</span>
          </p>
        </div>
        <WishlistButton tripId={trip.id} className="outlined" />
      </header>

      <div className="gallery">
        {trip.images.map((src, i) => <TripPhoto key={src + i} src={src} alt={`${trip.title}, photo ${i + 1}`} />)}
      </div>

      <div className="trip-layout">
        <article>
          <section className="operator">
            <span className="avatar lg">{trip.operator.name.charAt(0)}</span>
            <div>
              <h2>Run by {trip.operator.name}</h2>
              <p className="muted">
                {trip.operator.verified && <span className="verified"><Icon name="shield" size={14} /> Verified operator</span>}
                Operating since {trip.operator.since} · replies {trip.operator.responseTime}
              </p>
            </div>
          </section>

          <ul className="facts">
            <li><Icon name="clock" /><div><strong>{trip.durationHours >= 20 ? 'Overnight' : `${trip.durationHours} hours`}</strong><span>Departs {departs}</span></div></li>
            <li><Icon name="users" /><div><strong>Up to {trip.maxAnglers} anglers</strong><span>You book the whole boat</span></div></li>
            <li><Icon name="anchor" /><div><strong>{trip.boatSizeFt} ft boat</strong><span>{trip.hasBathroom ? 'Toilet on board' : 'No toilet on board'}</span></div></li>
            <li><Icon name={trip.instantBooking ? 'bolt' : 'check'} /><div><strong>{trip.instantBooking ? 'Instant book' : 'Request to book'}</strong><span>{trip.instantBooking ? 'Confirmed as soon as you pay' : 'Operator confirms your date'}</span></div></li>
          </ul>

          <section>
            <p className="lead">{trip.description}</p>
            <div className="chips wrap">
              <span className="chip static">{TRIP_TYPE_LABELS[trip.tripType]}</span>
              {trip.targetSpecies.map((s) => <span key={s} className="chip static">{s}</span>)}
            </div>
          </section>

          <section className="two-col">
            <div>
              <h2>What is included</h2>
              <ul className="ticks">{trip.inclusions.map((i) => <li key={i}><Icon name="check" size={16} /> {i}</li>)}</ul>
            </div>
            <div>
              <h2>Not included</h2>
              <ul className="ticks off">{trip.exclusions.map((i) => <li key={i}><Icon name="x" size={16} /> {i}</li>)}</ul>
            </div>
          </section>

          <section>
            <h2>The boat</h2>
            <dl className="specs">
              <div><dt>Name</dt><dd>{trip.boatName}</dd></div>
              <div><dt>Length</dt><dd>{trip.boatSizeFt} ft</dd></div>
              <div><dt>Capacity</dt><dd>{trip.maxAnglers} anglers plus crew</dd></div>
              <div><dt>Toilet</dt><dd>{trip.hasBathroom ? 'Yes' : 'No'}</dd></div>
              <div><dt>Safety</dt><dd>Life jackets, first-aid kit, radio</dd></div>
              <div><dt>Shade</dt><dd>{trip.boatSizeFt >= 22 ? 'Covered deck' : 'Open deck'}</dd></div>
            </dl>
          </section>

          <section>
            <h2>Where you will meet</h2>
            <p className="meet"><Icon name="pin" /> <span><strong>{trip.jetty}</strong><br /><span className="muted">{trip.district}, {trip.state}. Arrive 20 minutes before departure. The captain's phone number is shared once the booking is confirmed.</span></span></p>
            <h3>What to bring</h3>
            <ul className="bullets">{trip.bring.map((b) => <li key={b}>{b}</li>)}</ul>
          </section>

          <section>
            <h2>Cancellation policy: {policy.label}</h2>
            <p>{policy.summary}</p>
            <p className="muted">{WEATHER_PROMISE}</p>
          </section>

          <section id="reviews">
            <h2>{trip.reviewsCount > 0 ? <><Icon name="star" size={18} filled /> {trip.rating.toFixed(2)} · {trip.reviewsCount} reviews</> : 'No reviews yet'}</h2>
            <div className="reviews">
              {trip.reviews.map((r) => (
                <figure key={r.author + r.comment} className="review">
                  <figcaption>
                    <span className="avatar">{r.author.charAt(0)}</span>
                    <div><strong>{r.author}</strong><span className="muted">{r.when}</span></div>
                    <span className="stars" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={12} filled={i < r.rating} />)}
                    </span>
                  </figcaption>
                  <blockquote>{r.comment}</blockquote>
                </figure>
              ))}
            </div>
            <p className="muted small">Reviews come only from anglers who completed this trip.</p>
          </section>
        </article>

        <BookingCard key={trip.id} trip={trip} initialDate={initialDate} initialAnglers={initialAnglers} />
      </div>
    </div>
  );
}
