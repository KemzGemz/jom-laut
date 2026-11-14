'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar } from '@/components/Calendar';
import { Stepper } from '@/components/Stepper';
import { addDays, formatDate, formatTime, today, type ISODate } from '@/lib/dates';
import { formatMyr, quote } from '@/lib/pricing';
import { availableTimes, BOOKING_WINDOW_DAYS } from '@/lib/repo';
import { useStore } from '@/lib/store';
import type { Trip } from '@/lib/types';

export function BookingCard({ trip, initialDate, initialAnglers }: { trip: Trip; initialDate?: ISODate; initialAnglers?: number }) {
  const router = useRouter();
  const { bookings, ready } = useStore();
  // Availability depends on "today" and on the saved session, so it is only worked out in the browser.
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState<ISODate | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [anglers, setAnglers] = useState(Math.min(Math.max(initialAnglers ?? 2, 1), trip.maxAnglers));

  // Departures this customer already holds are no longer on offer.
  const mine = bookings.filter((b) => b.tripId === trip.id && b.status !== 'CANCELLED');
  const openTimes = (d: ISODate) => availableTimes(trip, d).filter((t) => !mine.some((b) => b.date === d && b.time === t));
  const isOpen = (d: ISODate) => openTimes(d).length > 0;

  useEffect(() => {
    if (!ready) return;
    setMounted(true);
    if (initialDate && isOpen(initialDate)) pick(initialDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function pick(next: ISODate) {
    setDate(next);
    const times = openTimes(next);
    setTime((current) => (current && times.includes(current) ? current : times[0] ?? null));
  }

  const q = quote(trip);
  const times = date ? openTimes(date) : [];
  const soonest = mounted
    ? Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today(), i + 1)).find(isOpen)
    : undefined;
  const unavailableRequested = mounted && initialDate && !date;

  function reserve() {
    if (!date || !time) return;
    const params = new URLSearchParams({ date, time, anglers: String(anglers) });
    router.push(`/book/${trip.id}?${params.toString()}`);
  }

  return (
    <aside className="booking-card" id="book">
      <div className="bc-price"><strong>{formatMyr(trip.priceSen)}</strong> <span className="muted">per boat</span></div>

      {unavailableRequested && (
        <p className="notice warn">Not available on {formatDate(initialDate)}. Pick another date below.</p>
      )}

      <h3>Date</h3>
      {mounted ? (
        <Calendar selected={date} onSelect={pick} isDisabled={(d) => !isOpen(d)} />
      ) : (
        <div className="calendar skeleton" aria-hidden="true" />
      )}
      {!date && soonest && (
        <button type="button" className="link-btn" onClick={() => pick(soonest)}>Next available: {formatDate(soonest)}</button>
      )}

      {date && (
        <>
          <h3>Departure</h3>
          <div className="chips wrap">
            {trip.departureTimes.map((t) => (
              <button key={t} type="button" className={`chip${time === t ? ' on' : ''}`} disabled={!times.includes(t)} aria-pressed={time === t} onClick={() => setTime(t)}>
                {formatTime(t)}{!times.includes(t) && ' · taken'}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="row-between bc-anglers">
        <div>
          <h3>Anglers</h3>
          <span className="muted small">Up to {trip.maxAnglers} on this boat</span>
        </div>
        <Stepper label="anglers" value={anglers} max={trip.maxAnglers} onChange={setAnglers} />
      </div>

      <button className="btn btn-primary btn-block" onClick={reserve} disabled={!date || !time}>
        {!date ? 'Choose a date' : trip.instantBooking ? 'Reserve' : 'Request to book'}
      </button>
      <p className="muted small center">You will not be charged yet</p>

      {date && (
        <dl className="price-lines">
          <div><dt>Boat charter, {formatDate(date)}</dt><dd>{formatMyr(q.priceSen)}</dd></div>
          <div><dt>Service fee</dt><dd>{formatMyr(q.serviceFeeSen)}</dd></div>
          <div className="total"><dt>Total</dt><dd>{formatMyr(q.totalSen)}</dd></div>
          <div className="muted"><dt>Split {anglers} way{anglers === 1 ? '' : 's'}</dt><dd>{formatMyr(Math.ceil(q.totalSen / anglers))} each</dd></div>
          {trip.depositPct > 0 && <div className="muted"><dt>Or pay a {trip.depositPct}% deposit now</dt><dd>{formatMyr(q.depositSen)}</dd></div>}
        </dl>
      )}

      <div className="mobile-bar">
        <div><strong>{formatMyr(trip.priceSen)}</strong> <span className="muted">per boat</span><br /><span className="small muted">{date ? formatDate(date) : 'Choose a date'}</span></div>
        {date && time
          ? <button className="btn btn-primary" onClick={reserve}>{trip.instantBooking ? 'Reserve' : 'Request'}</button>
          : <a className="btn btn-primary" href="#book">Check dates</a>}
      </div>
    </aside>
  );
}
