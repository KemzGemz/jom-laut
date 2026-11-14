'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { stageOf } from '@/lib/bookings';
import { useOperator } from '@/lib/live';
import { BookingRow } from '../parts';

const TABS = { pending: 'Requests', confirmed: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' } as const;
type Tab = keyof typeof TABS;

export default function OperatorBookings() {
  const { bookings } = useOperator();
  const waiting = bookings.filter((b) => stageOf(b) === 'pending').length;
  const [tab, setTab] = useState<Tab>(waiting > 0 ? 'pending' : 'confirmed');

  const shown = bookings.filter((b) => stageOf(b) === tab);
  if (tab === 'completed' || tab === 'cancelled') shown.reverse();

  return (
    <div className="container page narrow">
      <h1>Bookings</h1>
      <div className="tabs" role="tablist">
        {(Object.keys(TABS) as Tab[]).map((t) => {
          const count = bookings.filter((b) => stageOf(b) === t).length;
          return (
            <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {TABS[t]} {count > 0 && <span className={`tag${t === 'pending' ? ' alert' : ''}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <Icon name="anchor" size={32} />
          <h2>{tab === 'pending' ? 'No requests waiting' : `No ${TABS[tab].toLowerCase()} bookings`}</h2>
        </div>
      ) : (
        <ul className="op-list">{shown.map((b) => <BookingRow key={b.ref} booking={b} showStatus={false} />)}</ul>
      )}
    </div>
  );
}
