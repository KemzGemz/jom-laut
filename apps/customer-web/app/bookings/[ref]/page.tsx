'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Icon } from '@/components/Icon';
import { SignInPrompt } from '@/components/SignInPrompt';
import { TripPhoto } from '@/components/TripCard';
import { STAGE_LABELS, stageOf } from '@/lib/bookings';
import { daysBetween, formatDate, formatTime, today } from '@/lib/dates';
import { formatMyr, POLICIES, refundFor } from '@/lib/pricing';
import { useMarket } from '@/lib/live';
import { useStore } from '@/lib/store';

function ReviewForm({ onSubmit }: { onSubmit: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return setError('Choose a star rating.');
    if (comment.trim().length < 10) return setError('Write a sentence about the trip (at least 10 characters).');
    onSubmit(rating, comment.trim());
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="star-pick" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>
            <Icon name="star" size={26} filled={n <= rating} />
          </button>
        ))}
      </div>
      <label className="field"><span>How was the trip?</span><textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="The boat, the crew, the fishing. What should other anglers know?" /></label>
      {error && <p className="notice warn" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit">Post review</button>
    </form>
  );
}

function BookingDetail({ bookingRef }: { bookingRef: string }) {
  const { user, ready, bookings, updateBooking, setOperator } = useStore();
  const { getTrip } = useMarket();
  const router = useRouter();
  const justBooked = useSearchParams().get('new') === '1';
  const [cancelling, setCancelling] = useState(false);

  if (!ready) return <div className="container page muted">Loading…</div>;
  if (!user) return <div className="container page narrow"><SignInPrompt title="Log in to see this booking" next={`/bookings/${bookingRef}`} /></div>;

  const booking = bookings.find((b) => b.ref === bookingRef && b.userEmail === user.email);
  const trip = booking && getTrip(booking.tripId);
  if (!booking || !trip) {
    return (
      <div className="container page narrow">
        <div className="empty">
          <h1>Booking not found</h1>
          <p className="muted">We could not find {bookingRef} on this account.</p>
          <Link className="btn btn-primary" href="/bookings">My bookings</Link>
        </div>
      </div>
    );
  }

  const stage = stageOf(booking);
  const daysAway = daysBetween(today(), booking.date);
  // A request that was never accepted has not been charged, so there is nothing to refund.
  const refundSen = stage === 'pending' ? 0 : refundFor(trip.cancellation, daysAway, booking.paidSen);
  const balanceSen = booking.totalSen - booking.paidSen;

  const headline = {
    pending: justBooked ? 'Request sent' : 'Waiting for the operator',
    confirmed: justBooked ? 'You are going fishing!' : 'Booking confirmed',
    completed: 'Trip completed',
    cancelled: booking.cancelledBy === 'operator' ? (booking.paidSen === 0 ? 'The operator could not take this trip' : 'Cancelled by the operator') : 'Booking cancelled',
  }[stage];
  const detail = {
    pending: `${trip.operator.name} usually replies ${trip.operator.responseTime}. You are only charged if they accept.`,
    confirmed: `A confirmation was sent to ${booking.userEmail}. Meet the crew at ${trip.jetty} 20 minutes before departure.`,
    completed: 'Hope the icebox came back full.',
    cancelled: booking.cancelledBy === 'operator'
      ? `${booking.cancelReason ? `${trip.operator.name} said: "${booking.cancelReason}" ` : ''}${booking.refundSen ? `${formatMyr(booking.refundSen)} is on its way back to your original payment method.` : 'Nothing was charged.'}`
      : booking.paidSen === 0 ? 'Nothing was charged for this request.' : booking.refundSen ? `${formatMyr(booking.refundSen)} is on its way back to your original payment method.` : 'No refund was due under the cancellation policy.',
  }[stage];

  function cancel() {
    updateBooking(booking!.ref, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'customer',
      refundSen,
      paidSen: stage === 'pending' ? 0 : booking!.paidSen,
    });
    setCancelling(false);
  }

  return (
    <div className="container page narrow">
      <Link href="/bookings" className="back-link"><Icon name="left" size={16} /> My bookings</Link>

      <div className={`banner ${stage}`}>
        <span className={`status ${stage}`}>{STAGE_LABELS[stage]}</span>
        <h1>{headline}</h1>
        <p>{detail}</p>
        <p className="muted small">Booking reference <strong>{booking.ref}</strong></p>
      </div>

      <section className="card">
        <Link href={`/trips/${trip.id}`} className="summary-trip">
          <TripPhoto src={trip.images[0]!} alt="" />
          <div><strong>{trip.title}</strong><span className="muted small">{trip.operator.name} · {trip.boatName}, {trip.boatSizeFt} ft</span></div>
        </Link>
        <dl className="summary-facts">
          <div><dt>Date</dt><dd>{formatDate(booking.date, 'long')}</dd></div>
          <div><dt>Departure</dt><dd>{formatTime(booking.time)}</dd></div>
          <div><dt>Meeting point</dt><dd>{trip.jetty}, {trip.district}</dd></div>
          <div><dt>Anglers</dt><dd>{booking.anglers}</dd></div>
          <div><dt>Trip leader</dt><dd>{booking.organiserName} · {booking.organiserPhone}</dd></div>
          {booking.notes && <div><dt>Note for captain</dt><dd>{booking.notes}</dd></div>}
        </dl>
      </section>

      <section className="card">
        <h2>Payment</h2>
        <dl className="price-lines">
          <div><dt>Boat charter</dt><dd>{formatMyr(booking.priceSen)}</dd></div>
          <div><dt>Service fee</dt><dd>{formatMyr(booking.serviceFeeSen)}</dd></div>
          <div className="total"><dt>Total (MYR)</dt><dd>{formatMyr(booking.totalSen)}</dd></div>
          <div><dt>{stage === 'pending' ? 'To be charged on acceptance' : 'Paid'}</dt><dd>{formatMyr(booking.paidSen)}</dd></div>
          {balanceSen > 0 && stage !== 'cancelled' && <div className="muted"><dt>Balance due 3 days before</dt><dd>{formatMyr(balanceSen)}</dd></div>}
          {stage === 'cancelled' && <div><dt>Refunded</dt><dd>{formatMyr(booking.refundSen ?? 0)}</dd></div>}
        </dl>
      </section>

      {(stage === 'pending' || stage === 'confirmed') && (
        <section className="card">
          <h2>Need to change plans?</h2>
          <p className="muted"><strong>{POLICIES[trip.cancellation].label} policy.</strong> {POLICIES[trip.cancellation].summary}</p>
          {cancelling ? (
            <div className="notice warn block">
              <p>
                Cancel this booking {daysAway} day{daysAway === 1 ? '' : 's'} before departure?{' '}
                {stage === 'pending' ? 'Nothing has been charged.' : <>You will be refunded <strong>{formatMyr(refundSen)}</strong> of the {formatMyr(booking.paidSen)} paid.</>}
              </p>
              <div className="empty-actions">
                <button className="btn btn-danger" onClick={cancel}>Yes, cancel booking</button>
                <button className="btn btn-outline" onClick={() => setCancelling(false)}>Keep booking</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-outline" onClick={() => setCancelling(true)}>Cancel booking</button>
          )}
        </section>
      )}

      {stage === 'completed' && (
        <section className="card">
          <h2>{booking.review ? 'Your review' : 'Rate this trip'}</h2>
          {booking.review ? (
            <>
              <p className="stars" aria-label={`${booking.review.rating} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={16} filled={n <= booking.review!.rating} />)}</p>
              <p>{booking.review.comment}</p>
              <p className="muted small">Thank you. Your review is now on the <Link className="link" href={`/trips/${trip.id}#reviews`}>trip page</Link>.</p>
            </>
          ) : (
            <>
              <p className="muted">Only anglers who completed a trip can review it, so your word carries weight with the next group.</p>
              <ReviewForm onSubmit={(rating, comment) => updateBooking(booking.ref, { review: { rating, comment } })} />
            </>
          )}
        </section>
      )}

      {stage === 'confirmed' && (
        <p className="muted small demo-note">
          Prototype only: <button className="link-btn" onClick={() => updateBooking(booking.ref, { completedAt: new Date().toISOString() })}>mark this trip as completed</button> to try leaving a review.
        </p>
      )}
      {stage === 'pending' && (
        <p className="muted small demo-note">
          Prototype only: <button className="link-btn" onClick={() => { setOperator(trip.operator.id); router.push(`/operator/bookings/${booking.ref}`); }}>open this request as {trip.operator.name}</button> to accept or decline it.
        </p>
      )}
      {(stage === 'completed' || stage === 'cancelled') && <Link className="btn btn-primary" href={`/trips/${trip.id}`}>Book this trip again</Link>}
    </div>
  );
}

export default function BookingPage({ params }: { params: { ref: string } }) {
  return (
    <Suspense fallback={<div className="container page muted">Loading…</div>}>
      <BookingDetail bookingRef={params.ref} />
    </Suspense>
  );
}
