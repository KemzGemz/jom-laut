'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { stageOf } from '@/lib/bookings';
import { formatDate, formatTime } from '@/lib/dates';
import { useOperator } from '@/lib/live';
import { COMMISSION_PCT, payoutOf } from '@/lib/market';
import { formatMyr } from '@/lib/pricing';
import { anglersLabel, OP_STAGE_LABELS, useBookingActions } from '../../parts';

const REASONS = ['Boat is not available that day', 'Weather or sea conditions', 'Crew not available', 'Group does not suit this trip'];

export default function OperatorBooking({ params }: { params: { ref: string } }) {
  const { bookings } = useOperator();
  const { accept, cancel } = useBookingActions();
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);

  const b = bookings.find((x) => x.ref === params.ref);
  if (!b) {
    return (
      <div className="container page narrow">
        <div className="empty">
          <h1>Booking not found</h1>
          <p className="muted">{params.ref} is not a booking on one of your listings.</p>
          <Link className="btn btn-primary" href="/operator/bookings">All bookings</Link>
        </div>
      </div>
    );
  }

  const stage = stageOf(b);
  const pay = payoutOf(b);
  const headline = {
    pending: `${b.organiserName} wants to book`,
    confirmed: 'Confirmed trip',
    completed: 'Completed trip',
    cancelled: b.cancelledBy !== 'operator' ? 'The customer cancelled' : b.paidSen === 0 ? 'You declined this request' : 'You cancelled this trip',
  }[stage];
  const detail = {
    pending: 'The date is held for this customer until you reply. They are only charged if you accept.',
    confirmed: `Be at ${b.trip.jetty} 20 minutes before departure. The customer has your phone number.`,
    completed: 'Your payout is sent 2 working days after the trip.',
    cancelled: b.cancelledBy === 'operator' ? `Reason given: ${b.cancelReason || 'none'}. The date is open again.` : 'The date is open again for other customers.',
  }[stage];

  return (
    <div className="container page narrow">
      <Link href="/operator/bookings" className="back-link"><Icon name="left" size={16} /> Bookings</Link>

      <div className={`banner ${stage}`}>
        <span className={`status ${stage}`}>{OP_STAGE_LABELS[stage]}</span>
        <h1>{headline}</h1>
        <p>{detail}</p>
        <p className="muted small">Booking reference <strong>{b.ref}</strong></p>
        {stage === 'pending' && !closing && (
          <div className="op-actions">
            <button className="btn btn-primary" onClick={() => accept(b)}>Accept request</button>
            <button className="btn btn-outline" onClick={() => setClosing(true)}>Decline</button>
          </div>
        )}
      </div>

      {closing && (stage === 'pending' || stage === 'confirmed') && (
        <section className="card">
          <h2>{stage === 'pending' ? 'Decline this request?' : 'Cancel this trip?'}</h2>
          <p className="muted">
            {stage === 'pending'
              ? 'The customer is not charged and is told why.'
              : `The customer is refunded in full (${formatMyr(b.paidSen)}) and you receive no payout. Frequent cancellations lower your place in search.`}
          </p>
          <label className="field">
            <span>Reason shown to the customer</span>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <div className="op-actions">
            <button className="btn btn-danger" onClick={() => { cancel(b, reason); setClosing(false); }}>{stage === 'pending' ? 'Decline request' : 'Cancel trip and refund'}</button>
            <button className="btn btn-outline" onClick={() => setClosing(false)}>Go back</button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Trip</h2>
        <dl className="summary-facts">
          <div><dt>Listing</dt><dd><Link className="link" href={`/operator/listings/${b.trip.id}`}>{b.trip.title}</Link></dd></div>
          <div><dt>Date</dt><dd>{formatDate(b.date, 'long')}</dd></div>
          <div><dt>Departure</dt><dd>{formatTime(b.time)} from {b.trip.jetty}</dd></div>
          <div><dt>Boat</dt><dd>{b.trip.boatName}, {b.trip.boatSizeFt} ft</dd></div>
        </dl>
      </section>

      <section className="card">
        <h2>Customer</h2>
        <dl className="summary-facts">
          <div><dt>Trip leader</dt><dd>{b.organiserName}</dd></div>
          <div><dt>Group</dt><dd>{anglersLabel(b.anglers)} (boat takes {b.trip.maxAnglers})</dd></div>
          <div><dt>Mobile</dt><dd>{stage === 'confirmed' || stage === 'completed' ? b.organiserPhone : <span className="muted">Shared once the booking is confirmed</span>}</dd></div>
          <div><dt>Note</dt><dd>{b.notes || <span className="muted">None</span>}</dd></div>
        </dl>
      </section>

      <section className="card">
        <h2>Your payout</h2>
        {stage === 'cancelled' ? (
          <p className="muted">No payout. {b.refundSen ? `The customer was refunded ${formatMyr(b.refundSen)}.` : 'The customer was not charged.'}</p>
        ) : (
          <>
            <dl className="price-lines">
              <div><dt>Boat price</dt><dd>{formatMyr(pay.grossSen)}</dd></div>
              <div><dt>AngleX commission ({COMMISSION_PCT}%)</dt><dd>−{formatMyr(pay.commissionSen)}</dd></div>
              <div className="total"><dt>You receive</dt><dd>{formatMyr(pay.netSen)}</dd></div>
            </dl>
            <p className="muted small op-fine">
              {stage === 'pending' ? 'Charged to the customer only if you accept. ' : b.payOption === 'deposit' && stage === 'confirmed' ? 'The customer paid a deposit; the balance is collected 3 days before the trip. ' : 'The customer has paid in full. '}
              AngleX collects the money, so there is nothing to collect at the jetty.
            </p>
          </>
        )}
      </section>

      {stage === 'confirmed' && !closing && (
        <button className="btn btn-outline" onClick={() => setClosing(true)}>Cancel this trip</button>
      )}
    </div>
  );
}
