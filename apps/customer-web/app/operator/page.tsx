'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { stageOf } from '@/lib/bookings';
import { addDays, formatDate, formatTime, today } from '@/lib/dates';
import { useOperator } from '@/lib/live';
import { payoutOf } from '@/lib/market';
import { formatMyr } from '@/lib/pricing';
import { anglersLabel, BookingRow, useBookingActions } from './parts';

export default function OperatorOverview() {
  const { bookings, listings } = useOperator();
  const { accept } = useBookingActions();
  const now = today();
  const month = now.slice(0, 7);

  const requests = bookings.filter((b) => stageOf(b) === 'pending');
  const week = bookings.filter((b) => b.status === 'CONFIRMED' && b.date >= now && b.date <= addDays(now, 7));
  const net = (list: typeof bookings) => list.reduce((sum, b) => sum + payoutOf(b).netSen, 0);
  const earnedThisMonth = net(bookings.filter((b) => stageOf(b) === 'completed' && b.date.startsWith(month)));
  const upcoming = net(bookings.filter((b) => stageOf(b) === 'confirmed'));
  const live = listings.filter((t) => !t.paused).length;

  if (listings.length === 0) {
    return (
      <div className="container page narrow">
        <div className="empty">
          <Icon name="anchor" size={32} />
          <h1>Welcome aboard</h1>
          <p className="muted">Your operator account is set up. Publish your first trip so anglers can find and book your boat. We check your boat licence while you do.</p>
          <Link className="btn btn-primary" href="/operator/listings/new">Create your first listing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <ul className="stats">
        <li className={requests.length > 0 ? 'alert' : ''}><span>Requests waiting</span><strong>{requests.length}</strong><Link href="/operator/bookings" className="link small">See bookings</Link></li>
        <li><span>Trips in the next 7 days</span><strong>{week.length}</strong><Link href="/operator/calendar" className="link small">Open calendar</Link></li>
        <li><span>Earned this month</span><strong>{formatMyr(earnedThisMonth)}</strong><Link href="/operator/earnings" className="link small">See earnings</Link></li>
        <li><span>Still to come</span><strong>{formatMyr(upcoming)}</strong><span className="muted small">{live} of {listings.length} listings live</span></li>
      </ul>

      <section className="section">
        <h2>Needs your reply</h2>
        {requests.length === 0 ? (
          <p className="muted op-none">No requests are waiting. Instant-book trips are confirmed for you automatically.</p>
        ) : (
          <ul className="op-requests">
            {requests.map((b) => (
              <li key={b.ref} className="card">
                <div className="row-between">
                  <strong>{b.organiserName} · {anglersLabel(b.anglers)}</strong>
                  <span className="status pending">Reply within 24 hours</span>
                </div>
                <p>{b.trip.title}<br /><span className="muted">{formatDate(b.date, 'long')} · {formatTime(b.time)}</span></p>
                {b.notes && <p className="muted">“{b.notes}”</p>}
                <div className="row-between">
                  <span>You receive <strong>{formatMyr(payoutOf(b).netSen)}</strong></span>
                  <div className="op-actions">
                    <Link className="btn btn-outline" href={`/operator/bookings/${b.ref}`}>Details</Link>
                    <button className="btn btn-primary" onClick={() => accept(b)}>Accept</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Coming up</h2>
          <Link href="/operator/bookings" className="link">All bookings</Link>
        </div>
        {week.length === 0 ? (
          <div className="empty compact">
            <Icon name="anchor" size={28} />
            <p className="muted">No trips in the next 7 days. Open more dates in your calendar to be found in search.</p>
          </div>
        ) : (
          <ul className="op-list">{week.map((b) => <BookingRow key={b.ref} booking={b} showStatus={false} />)}</ul>
        )}
      </section>
    </div>
  );
}
