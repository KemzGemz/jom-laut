'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { SignInPrompt } from '@/components/SignInPrompt';
import { TripPhoto } from '@/components/TripCard';
import { STAGE_LABELS, stageOf } from '@/lib/bookings';
import { formatDate, formatTime } from '@/lib/dates';
import { formatMyr } from '@/lib/pricing';
import { getTrip } from '@/lib/repo';
import { useStore } from '@/lib/store';

const TABS = { upcoming: 'Upcoming', past: 'Past', cancelled: 'Cancelled' } as const;
type Tab = keyof typeof TABS;

export default function BookingsPage() {
  const { user, ready, bookings } = useStore();
  const [tab, setTab] = useState<Tab>('upcoming');

  if (!ready) return <div className="container page muted">Loading…</div>;
  if (!user) return <div className="container page narrow"><SignInPrompt title="Log in to see your bookings" next="/bookings" /></div>;

  const mine = bookings.filter((b) => b.userEmail === user.email);
  const groups: Record<Tab, typeof mine> = {
    upcoming: mine.filter((b) => ['pending', 'confirmed'].includes(stageOf(b))).sort((a, b) => a.date.localeCompare(b.date)),
    past: mine.filter((b) => stageOf(b) === 'completed'),
    cancelled: mine.filter((b) => stageOf(b) === 'cancelled'),
  };
  const shown = groups[tab];

  return (
    <div className="container page narrow">
      <h1>My bookings</h1>
      <div className="tabs" role="tablist">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {TABS[t]} {groups[t].length > 0 && <span className="tag">{groups[t].length}</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <Icon name="anchor" size={32} />
          <h2>{tab === 'upcoming' ? 'No trips booked yet' : `No ${TABS[tab].toLowerCase()} trips`}</h2>
          {tab === 'upcoming' && <><p className="muted">When you book a boat it will show up here with everything you need for the day.</p><Link className="btn btn-primary" href="/search">Find a trip</Link></>}
        </div>
      ) : (
        <ul className="booking-list">
          {shown.map((b) => {
            const trip = getTrip(b.tripId);
            if (!trip) return null;
            const stage = stageOf(b);
            return (
              <li key={b.ref}>
                <Link href={`/bookings/${b.ref}`} className="booking-row">
                  <TripPhoto src={trip.images[0]!} alt="" />
                  <div>
                    <span className={`status ${stage}`}>{STAGE_LABELS[stage]}</span>
                    <strong>{trip.title}</strong>
                    <span className="muted">{formatDate(b.date, 'long')} · {formatTime(b.time)} · {b.anglers} angler{b.anglers === 1 ? '' : 's'}</span>
                    <span className="muted small">{b.ref} · {formatMyr(b.totalSen)}</span>
                  </div>
                  <Icon name="right" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
