'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { useOperator } from '@/lib/live';
import { COMMISSION_PCT } from '@/lib/market';
import { formatMyr, POLICIES } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import { TRIP_TYPE_LABELS, type CancellationPolicy, type Trip, type TripType } from '@/lib/types';

const DEPOSIT_MIN_RM = 1000;
const lines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);

/** Starting point for a new listing: the operator's own jetty, boat and photos. */
function blank(template: Trip, id: string): Trip {
  return {
    ...template,
    id,
    seed: 0,
    paused: false,
    title: '',
    description: '',
    targetSpecies: [],
    tripType: 'bottom',
    durationHours: 6,
    departureTimes: ['07:00'],
    priceSen: 0,
    depositPct: 0,
    instantBooking: true,
    cancellation: 'moderate',
    rating: 0,
    reviewsCount: 0,
    reviews: [],
  };
}

function ListingForm({ initial, isNew }: { initial: Trip; isNew: boolean }) {
  const router = useRouter();
  const { saveListing } = useStore();
  const [t, setT] = useState(initial);
  const [price, setPrice] = useState(initial.priceSen ? String(initial.priceSen / 100) : '');
  const [species, setSpecies] = useState(initial.targetSpecies.join(', '));
  const [included, setIncluded] = useState(initial.inclusions.join('\n'));
  const [excluded, setExcluded] = useState(initial.exclusions.join('\n'));
  const [second, setSecond] = useState(initial.departureTimes[1] ?? '');
  const [error, setError] = useState('');
  const set = (patch: Partial<Trip>) => setT((prev) => ({ ...prev, ...patch }));

  const priceRm = Number(price);
  const depositAllowed = priceRm >= DEPOSIT_MIN_RM;
  const keepSen = Math.round(priceRm * 100 * (1 - COMMISSION_PCT / 100));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const first = t.departureTimes[0] ?? '';
    if (t.title.trim().length < 10) return setError('Give the trip a title of at least 10 characters, for example "Half-day bottom fishing near Pulau Kapas".');
    if (!Number.isFinite(priceRm) || priceRm < 100 || priceRm > 20000) return setError('Enter a price per boat between RM100 and RM20,000.');
    if (!t.durationHours || !t.maxAnglers || t.boatSizeFt < 10) return setError('Fill in the length of the trip, the boat length (10 ft or more) and how many anglers you take.');
    if (!first) return setError('Enter a departure time.');
    if (second && second === first) return setError('The two departure times are the same. Clear the second one or change it.');
    if (t.description.trim().length < 40) return setError('Describe the trip in a sentence or two (at least 40 characters) so anglers know what to expect.');
    if (lines(species.replace(/,/g, '\n')).length === 0) return setError('Add at least one target fish.');
    setError('');

    saveListing({
      ...t,
      title: t.title.trim(),
      description: t.description.trim(),
      jetty: t.jetty.trim() || initial.jetty,
      boatName: t.boatName.trim() || initial.boatName,
      priceSen: Math.round(priceRm * 100),
      depositPct: depositAllowed && t.depositPct > 0 ? 30 : 0,
      departureTimes: [first, ...(second ? [second] : [])].sort(),
      targetSpecies: lines(species.replace(/,/g, '\n')),
      inclusions: lines(included),
      exclusions: lines(excluded),
    });
    router.push('/operator/listings');
  }

  const num = (key: 'durationHours' | 'maxAnglers' | 'boatSizeFt', label: string, min: number, max: number) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" min={min} max={max} required value={t[key] || ''} onChange={(e) => set({ [key]: Math.min(max, Math.max(0, Math.round(Number(e.target.value)))) })} />
    </label>
  );

  return (
    <form className="container page narrow" onSubmit={save} noValidate>
      <Link href="/operator/listings" className="back-link"><Icon name="left" size={16} /> Listings</Link>
      <div className="row-between">
        <h1>{isNew ? 'New listing' : 'Edit listing'}</h1>
        {!isNew && <Link className="link" href={`/trips/${t.id}`}>View as customer</Link>}
      </div>

      <section className="step">
        <h2>The trip</h2>
        <label className="field"><span>Title</span><input className="input" value={t.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} placeholder="Half-day bottom fishing near Pulau Kapas" /></label>
        <div className="form two">
          <label className="field">
            <span>Type of fishing</span>
            <select className="input" value={t.tripType} onChange={(e) => set({ tripType: e.target.value as TripType })}>
              {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((k) => <option key={k} value={k}>{TRIP_TYPE_LABELS[k]}</option>)}
            </select>
          </label>
          {num('durationHours', 'Length of trip (hours)', 1, 48)}
        </div>
        <label className="field"><span>Target fish, separated by commas</span><input className="input" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Red snapper, Grouper" /></label>
        <label className="field"><span>Description</span><textarea className="input" rows={4} value={t.description} onChange={(e) => set({ description: e.target.value })} placeholder="Where you go, what the day looks like, who it suits" /></label>
      </section>

      <section className="step">
        <h2>Departures</h2>
        <div className="form two">
          <label className="field"><span>Departure time</span><input className="input" type="time" value={t.departureTimes[0] ?? ''} onChange={(e) => set({ departureTimes: [e.target.value] })} /></label>
          <label className="field"><span>Second departure (optional)</span><input className="input" type="time" value={second} onChange={(e) => setSecond(e.target.value)} /></label>
        </div>
        <label className="field"><span>Jetty</span><input className="input" value={t.jetty} onChange={(e) => set({ jetty: e.target.value })} /></label>
        <p className="muted small">Listed under {t.district}, {t.state}. Each departure is one booking for the whole boat. Close individual dates in your calendar.</p>
      </section>

      <section className="step">
        <h2>The boat</h2>
        <div className="form two">
          <label className="field"><span>Boat name</span><input className="input" value={t.boatName} onChange={(e) => set({ boatName: e.target.value })} /></label>
          {num('boatSizeFt', 'Length (ft)', 10, 80)}
        </div>
        <div className="form two">
          {num('maxAnglers', 'Most anglers on board', 1, 20)}
          <label className="check"><input type="checkbox" checked={t.hasBathroom} onChange={(e) => set({ hasBathroom: e.target.checked })} /><span><strong>Toilet on board</strong></span></label>
        </div>
        <p className="muted small">Photos: this prototype reuses your existing boat photos. Uploading comes with the real backend.</p>
      </section>

      <section className="step">
        <h2>Price</h2>
        <label className="field">
          <span>Price per boat (RM)</span>
          <input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} placeholder="950" />
        </label>
        {priceRm > 0 && (
          <p className="muted small">
            You receive {formatMyr(keepSen)} per trip after the {COMMISSION_PCT}% commission. Customers also pay a 5% service fee on top
            {t.maxAnglers > 0 && `, so a full boat works out at about ${formatMyr(Math.ceil((priceRm * 105) / t.maxAnglers))} each`}.
          </p>
        )}
        <label className="check">
          <input type="checkbox" disabled={!depositAllowed} checked={depositAllowed && t.depositPct > 0} onChange={(e) => set({ depositPct: e.target.checked ? 30 : 0 })} />
          <span><strong>Let customers pay a 30% deposit</strong><small>{depositAllowed ? 'The balance is collected for you 3 days before the trip.' : `Available for trips priced at RM${DEPOSIT_MIN_RM.toLocaleString('en-MY')} or more.`}</small></span>
        </label>
      </section>

      <section className="step">
        <h2>How customers book</h2>
        <div className="choices" role="radiogroup" aria-label="Booking mode">
          <label className={`choice${t.instantBooking ? ' on' : ''}`}>
            <input type="radio" name="mode" checked={t.instantBooking} onChange={() => set({ instantBooking: true })} />
            <span><strong>Instant book</strong><small>Any open date is confirmed as soon as the customer pays. Gets more bookings.</small></span>
          </label>
          <label className={`choice${!t.instantBooking ? ' on' : ''}`}>
            <input type="radio" name="mode" checked={!t.instantBooking} onChange={() => set({ instantBooking: false })} />
            <span><strong>Request to book</strong><small>You accept or decline each request within 24 hours.</small></span>
          </label>
        </div>
        <label className="field">
          <span>Cancellation policy</span>
          <select className="input" value={t.cancellation} onChange={(e) => set({ cancellation: e.target.value as CancellationPolicy })}>
            {(Object.keys(POLICIES) as CancellationPolicy[]).map((k) => <option key={k} value={k}>{POLICIES[k].label}: {POLICIES[k].summary}</option>)}
          </select>
        </label>
      </section>

      <section className="step">
        <h2>What is included</h2>
        <div className="form two">
          <label className="field"><span>Included, one per line</span><textarea className="input" rows={6} value={included} onChange={(e) => setIncluded(e.target.value)} /></label>
          <label className="field"><span>Not included, one per line</span><textarea className="input" rows={6} value={excluded} onChange={(e) => setExcluded(e.target.value)} /></label>
        </div>
      </section>

      {error && <p className="notice warn" role="alert">{error}</p>}
      <div className="op-actions op-save">
        <button className="btn btn-primary btn-lg" type="submit">{isNew ? 'Publish listing' : 'Save changes'}</button>
        <Link className="btn btn-outline btn-lg" href="/operator/listings">Cancel</Link>
      </div>
      <p className="muted small">Changes apply to new bookings only. Bookings you already have keep the price the customer agreed to.</p>
    </form>
  );
}

export default function OperatorListing({ params }: { params: { id: string } }) {
  const { account, listings } = useOperator();
  const [newId] = useState(() => `${account?.id ?? 'listing'}-${Date.now().toString(36)}`);
  const isNew = params.id === 'new';
  const existing = listings.find((t) => t.id === params.id);
  const template = listings[0];

  if (isNew && template) return <ListingForm initial={blank(template, newId)} isNew />;
  if (existing) return <ListingForm key={existing.id} initial={existing} isNew={false} />;
  return (
    <div className="container page narrow">
      <div className="empty">
        <h1>Listing not found</h1>
        <p className="muted">This is not one of your listings.</p>
        <Link className="btn btn-primary" href="/operator/listings">Your listings</Link>
      </div>
    </div>
  );
}
