'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Icon } from '@/components/Icon';
import { SignInPrompt } from '@/components/SignInPrompt';
import { TripPhoto } from '@/components/TripCard';
import { STAGE_LABELS, stageOf } from '@/lib/bookings';
import { daysBetween, formatDate, formatTime, today } from '@/lib/dates';
import { formatMyr, POLICIES, refundFor } from '@/lib/pricing';
import { getTrip } from '@/lib/repo';
import { useStore } from '@/lib/store';

function BookingDetail({ bookingRef }: { bookingRef: string }) {
  const { user, ready, bookings, updateBooking } = useStore();
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
    cancelled: 'Booking cancelled',
  }[stage];
  const detail = {
    pending: `${trip.operator.name} usually replies ${trip.operator.responseTime}. You are only charged if they accept.`,
    confirmed: `A confirmation was sent to ${booking.userEmail}. Meet the crew at ${trip.jetty} 20 minutes before departure.`,
    completed: 'Hope the icebox came back full.',
    cancelled: booking.paidSen === 0 ? 'Nothing was charged for this request.' : booking.refundSen ? `${formatMyr(booking.refundSen)} is on its way back to your original payment method.` : 'No refund was due under the cancellation policy.',
  }[stage];

  function cancel() {
    updateBooking(booking!.ref, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
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

      {stage === 'pending' && (
        <p className="muted small demo-note">
          Prototype only: <button className="link-btn" onClick={() => updateBooking(booking.ref, { status: 'CONFIRMED' })}>simulate the operator accepting</button>
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
