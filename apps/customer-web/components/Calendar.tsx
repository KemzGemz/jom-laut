'use client';

import { useState } from 'react';
import { fromISO, today, toISO, type ISODate } from '@/lib/dates';
import { Icon } from './Icon';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' });

export function Calendar({
  selected,
  onSelect,
  isDisabled,
}: {
  selected?: ISODate | null;
  onSelect: (date: ISODate) => void;
  /** Extra rule on top of "not in the past", e.g. no departures that day. */
  isDisabled?: (date: ISODate) => boolean;
}) {
  const now = today();
  const start = fromISO(selected && selected >= now ? selected : now);
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const thisMonth = fromISO(now);
  const atCurrentMonth = view.y === thisMonth.getFullYear() && view.m === thisMonth.getMonth();

  function shift(delta: number) {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={atCurrentMonth} aria-label="Previous month">
          <Icon name="left" />
        </button>
        <span aria-live="polite">{MONTH.format(first)}</span>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
          <Icon name="right" />
        </button>
      </div>
      <div className="cal-grid">
        {DOW.map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <span key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = toISO(new Date(view.y, view.m, i + 1));
          const disabled = date < now || (isDisabled?.(date) ?? false);
          return (
            <button
              type="button"
              key={date}
              className={`cal-day${selected === date ? ' selected' : ''}${date === now ? ' today' : ''}`}
              disabled={disabled}
              aria-pressed={selected === date}
              aria-label={date}
              onClick={() => onSelect(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
