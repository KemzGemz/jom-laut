'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { stageOf } from '@/lib/bookings';
import { addDays, formatDate, formatTime, fromISO, today, toISO, type ISODate } from '@/lib/dates';
import { HISTORY_DAYS, useMarket, useOperator } from '@/lib/live';
import { isBlocked } from '@/lib/market';
import { BOOKING_WINDOW_DAYS, isRestDay } from '@/lib/repo';
import { useStore } from '@/lib/store';
import { anglersLabel, OP_STAGE_LABELS } from '../parts';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' });

type DayKind = 'past' | 'rest' | 'closed' | 'request' | 'booked' | 'part' | 'open' | 'later';
const KIND_LABELS: Record<DayKind, string> = {
  past: '',
  rest: 'Rest day',
  closed: 'Closed',
  request: 'Request',
  booked: 'Booked',
  part: 'Part booked',
  open: 'Open',
  later: 'Not open yet',
};

export default function OperatorCalendar() {
  const { listings, bookings } = useOperator();
  const { state } = useMarket();
  const { setBlocked } = useStore();
  const now = today();
  const [listingId, setListingId] = useState(listings[0]?.id);
  const [view, setView] = useState(() => { const d = fromISO(now); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState<ISODate>(addDays(now, 1));

  const trip = listings.find((t) => t.id === listingId) ?? listings[0];
  if (!trip) return <div className="container page muted">You have no listings yet.</div>;

  const lastOpen = addDays(now, BOOKING_WINDOW_DAYS);
  const firstShown = addDays(now, -HISTORY_DAYS);
  const dayBookings = (date: ISODate) => bookings.filter((b) => b.trip.id === trip.id && b.date === date && b.status !== 'CANCELLED');

  function kindOf(date: ISODate): DayKind {
    if (date <= now) return 'past';
    if (date > lastOpen) return 'later';
    const active = dayBookings(date);
    if (active.some((b) => b.status === 'PENDING_APPROVAL')) return 'request';
    if (active.length >= trip!.departureTimes.length) return 'booked';
    if (isRestDay(trip!, date)) return 'rest';
    if (isBlocked(trip!, date, state)) return 'closed';
    return active.length > 0 ? 'part' : 'open';
  }

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const shift = (delta: number) => { const d = new Date(view.y, view.m + delta, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };
  const canGoBack = toISO(first) > firstShown;
  const canGoForward = toISO(new Date(view.y, view.m + 1, 1)) <= lastOpen;

  const kind = kindOf(selected);
  const onDay = dayBookings(selected);
  const blockedHere = isBlocked(trip, selected, state);
  const blockedEverywhere = listings.every((t) => isBlocked(t, selected, state));
  const canClose = kind === 'open' || kind === 'part' || kind === 'closed';

  return (
    <div className="container page">
      <div className="row-between">
        <h1>Calendar</h1>
        <Link className="link" href={`/operator/listings/${trip.id}`}>Edit this listing</Link>
      </div>

      {listings.length > 1 && (
        <div className="chips wrap op-pick" role="tablist" aria-label="Listing">
          {listings.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === trip.id} className={`chip${t.id === trip.id ? ' on' : ''}`} onClick={() => setListingId(t.id)}>
              {t.title}{t.paused && ' (paused)'}
            </button>
          ))}
        </div>
      )}
      {trip.paused && <p className="notice warn">This listing is paused, so customers cannot book any date until you resume it.</p>}

      <div className="op-cal-layout">
        <div>
          <div className="cal-head">
            <button className="icon-btn" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month"><Icon name="left" /></button>
            <span aria-live="polite">{MONTH.format(first)}</span>
            <button className="icon-btn" onClick={() => shift(1)} disabled={!canGoForward} aria-label="Next month"><Icon name="right" /></button>
          </div>
          <div className="op-cal">
            {DOW.map((d) => <span key={d} className="cal-dow">{d}</span>)}
            {Array.from({ length: first.getDay() }, (_, i) => <span key={`pad${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = toISO(new Date(view.y, view.m, i + 1));
              const k = kindOf(date);
              const trips = dayBookings(date).length;
              const label = k === 'past' ? (trips > 0 ? `${trips} trip${trips === 1 ? '' : 's'}` : '') : KIND_LABELS[k];
              return (
                <button
                  key={date}
                  className={`op-day ${k}${date === selected ? ' selected' : ''}${date === now ? ' today' : ''}`}
                  aria-pressed={date === selected}
                  aria-label={`${formatDate(date, 'long')}${label ? `, ${label}` : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span className="op-day-num">{i + 1}</span>
                  <span className="op-day-label">{label}</span>
                </button>
              );
            })}
          </div>
          <ul className="op-legend" aria-label="Legend">
            {(['open', 'booked', 'request', 'closed', 'rest'] as DayKind[]).map((k) => <li key={k}><span className={`op-swatch ${k}`} /> {KIND_LABELS[k]}</li>)}
          </ul>
        </div>

        <aside className="card op-day-panel" aria-live="polite">
          <h2>{formatDate(selected, 'long')}</h2>
          <p className="muted">
            {{
              past: selected === now ? 'Today. Customers book from tomorrow onwards.' : 'This date has passed.',
              later: `Customers can book up to ${BOOKING_WINDOW_DAYS} days ahead. This date opens later.`,
              rest: 'Your weekly rest day. Customers cannot book it.',
              closed: 'You closed this date. Customers cannot book it.',
              request: 'A customer is waiting for your reply on this date.',
              booked: 'Fully booked.',
              part: 'One departure is booked, the other is still open.',
              open: `Open for booking: ${trip.departureTimes.map(formatTime).join(' and ')}.`,
            }[kind]}
          </p>

          {onDay.length > 0 && (
            <ul className="op-day-bookings">
              {onDay.map((b) => (
                <li key={b.ref}>
                  <Link href={`/operator/bookings/${b.ref}`} className="op-day-booking">
                    <span><strong>{formatTime(b.time)} · {b.organiserName}</strong><span className="muted small">{anglersLabel(b.anglers)}</span></span>
                    <span className={`status ${stageOf(b)}`}>{OP_STAGE_LABELS[stageOf(b)]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {canClose && (
            <div className="op-actions stack">
              <button className={`btn ${blockedHere ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBlocked([trip.id], selected, !blockedHere)}>
                {blockedHere ? 'Reopen this date' : 'Close this date'}
              </button>
              {listings.length > 1 && (
                <button className="link-btn small" onClick={() => setBlocked(listings.map((t) => t.id), selected, !blockedEverywhere)}>
                  {blockedEverywhere ? 'Reopen on all my listings' : 'Close on all my listings'}
                </button>
              )}
              {kind === 'part' && <span className="muted small">Closing keeps the existing booking and stops new ones.</span>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
