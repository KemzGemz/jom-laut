'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate, type ISODate } from '@/lib/dates';
import { locations } from '@/lib/repo';
import { Calendar } from './Calendar';
import { Icon } from './Icon';
import { Stepper } from './Stepper';

export interface SearchValues {
  state?: string;
  district?: string;
  date?: ISODate;
  anglers?: number;
}

type Panel = 'where' | 'when' | 'who' | null;

export function SearchBar({ initial = {}, preserve }: { initial?: SearchValues; preserve?: string }) {
  const router = useRouter();
  const [values, setValues] = useState<SearchValues>(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  const options = useMemo(() => locations(), []);

  useEffect(() => {
    if (!panel) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [panel]);

  const whereLabel = values.district ? `${values.district}, ${values.state}` : values.state ?? 'Anywhere in Malaysia';
  const shown = options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(preserve);
    const set = (key: string, value?: string | number) => (value ? params.set(key, String(value)) : params.delete(key));
    set('state', values.state);
    set('district', values.district);
    set('date', values.date);
    set('anglers', values.anglers);
    setPanel(null);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form className="searchbar" onSubmit={submit} ref={ref} role="search">
      <div className="pop-anchor seg-wrap">
        <button type="button" className={`seg${panel === 'where' ? ' active' : ''}`} onClick={() => setPanel(panel === 'where' ? null : 'where')}>
          <span className="seg-label">Where</span>
          <span className={`seg-value${values.state ? '' : ' placeholder'}`}>{whereLabel}</span>
        </button>
        {panel === 'where' && (
          <div className="popover where-pop">
            <input autoFocus className="input" placeholder="Search a state or district" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <ul className="option-list">
              {!filter && (
                <li>
                  <button type="button" className="option" onClick={() => { setValues({ ...values, state: undefined, district: undefined }); setPanel('when'); }}>
                    <Icon name="globe" /> <span>Anywhere in Malaysia</span>
                  </button>
                </li>
              )}
              {shown.map((o) => (
                <li key={o.label}>
                  <button type="button" className={`option${o.district ? ' nested' : ''}`} onClick={() => { setValues({ ...values, state: o.state, district: o.district }); setFilter(''); setPanel('when'); }}>
                    <Icon name="pin" /> <span>{o.district ?? o.state}</span>
                    <small>{o.tripCount} trip{o.tripCount === 1 ? '' : 's'}</small>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="muted option-empty">No trips there yet. Try a nearby state.</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="pop-anchor seg-wrap">
        <button type="button" className={`seg${panel === 'when' ? ' active' : ''}`} onClick={() => setPanel(panel === 'when' ? null : 'when')}>
          <span className="seg-label">When</span>
          <span className={`seg-value${values.date ? '' : ' placeholder'}`}>{values.date ? formatDate(values.date) : 'Any date'}</span>
        </button>
        {panel === 'when' && (
          <div className="popover when-pop">
            <Calendar selected={values.date} onSelect={(date) => { setValues({ ...values, date }); setPanel('who'); }} />
            {values.date && (
              <button type="button" className="link-btn" onClick={() => setValues({ ...values, date: undefined })}>Clear date</button>
            )}
          </div>
        )}
      </div>

      <div className="pop-anchor seg-wrap">
        <button type="button" className={`seg${panel === 'who' ? ' active' : ''}`} onClick={() => setPanel(panel === 'who' ? null : 'who')}>
          <span className="seg-label">Anglers</span>
          <span className={`seg-value${values.anglers ? '' : ' placeholder'}`}>{values.anglers ? `${values.anglers} angler${values.anglers === 1 ? '' : 's'}` : 'Add anglers'}</span>
        </button>
        {panel === 'who' && (
          <div className="popover who-pop">
            <div className="row-between">
              <div>
                <strong>Anglers</strong>
                <div className="muted small">Everyone who will be on the boat</div>
              </div>
              <Stepper label="anglers" value={values.anglers ?? 0} min={0} max={12} onChange={(n) => setValues({ ...values, anglers: n || undefined })} />
            </div>
          </div>
        )}
      </div>

      <button type="submit" className="search-btn" aria-label="Search">
        <Icon name="search" /> <span>Search</span>
      </button>
    </form>
  );
}
