'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Rating, TripNotFound, TripPhoto, tripHref } from '@/components/TripCard';
import { formatDate, formatTime, isISODate } from '@/lib/dates';
import { useMarket } from '@/lib/live';
import { dueNow, formatMyr, POLICIES, quote, WEATHER_PROMISE } from '@/lib/pricing';
import { useStore } from '@/lib/store';
import type { Booking, PaymentMethod, PayOption, Trip } from '@/lib/types';

const HOLD_SECONDS = 10 * 60;
const METHODS: Record<PaymentMethod, { label: string; hint: string }> = {
  fpx: { label: 'Online banking (FPX)', hint: 'Pay from your bank account' },
  card: { label: 'Credit or debit card', hint: 'Visa, Mastercard' },
  ewallet: { label: 'E-wallet', hint: "Touch 'n Go, GrabPay, Boost" },
};

function newReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'AX-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Counts down a slot hold that survives a page reload. */
function useHold(key: string) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const storageKey = `anglex.hold.${key}`;
    let expiresAt = Number(window.sessionStorage.getItem(storageKey));
    if (!expiresAt || attempt > 0) {
      expiresAt = Date.now() + HOLD_SECONDS * 1000;
      window.sessionStorage.setItem(storageKey, String(expiresAt));
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [key, attempt]);

  return { secondsLeft, renew: () => setAttempt((n) => n + 1) };
}

/** Resolves the listing in the browser, where operator edits and new listings live. */
export function Checkout({ id, base }: { id: string; base?: Trip }) {
  const market = useMarket();
  const trip = market.getTrip(id) ?? base;
  if (!trip) return market.ready ? <TripNotFound /> : <div className="container page muted">Loading…</div>;
  return <CheckoutForm trip={trip} />;
}

function CheckoutForm({ trip }: { trip: Trip }) {
  const market = useMarket();
  const params = useSearchParams();
  const router = useRouter();
  const { user, ready, login, addBooking, updateProfile, bookings } = useStore();

  const dateParam = params.get('date');
  const date = isISODate(dateParam) ? dateParam : null;
  const time = params.get('time');
  const anglers = Math.min(Math.max(Number(params.get('anglers')) || 1, 1), trip.maxAnglers);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [payOption, setPayOption] = useState<PayOption>('full');
  const [method, setMethod] = useState<PaymentMethod>('fpx');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hold = useHold(`${trip.id}.${date}.${time}`);

  useEffect(() => {
    if (user) {
      setName((n) => n || user.name);
      setPhone((p) => p || user.phone || '');
    }
  }, [user]);

  const back = tripHref(trip, date ?? undefined, anglers);
  const alreadyBooked = bookings.find((b) => b.tripId === trip.id && b.date === date && b.time === time && b.status !== 'CANCELLED' && b.userEmail === user?.email);
  const slotOpen = !!date && !!time && market.openTimes(trip, date).includes(time);

  if (!ready) return <div className="container page muted">Loading…</div>;

  if (!slotOpen && !submitting) {
    return (
      <div className="container page narrow">
        <div className="empty">
          <Icon name="calendar" size={32} />
          <h1>{alreadyBooked ? 'You have already booked this departure' : 'That departure is no longer available'}</h1>
          <p className="muted">{alreadyBooked ? `Booking ${alreadyBooked.ref} covers this date and time.` : 'Someone else may have booked it, or the link is out of date.'}</p>
          <div className="empty-actions">
            {alreadyBooked && <Link className="btn btn-primary" href={`/bookings/${alreadyBooked.ref}`}>View booking</Link>}
            <Link className="btn btn-outline" href={`/trips/${trip.id}`}>Choose another date</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = quote(trip);
  const payNow = dueNow(q, payOption);
  const policy = POLICIES[trip.cancellation];
  const expired = hold.secondsLeft === 0;
  const clock = hold.secondsLeft === null ? '10:00' : `${Math.floor(hold.secondsLeft / 60)}:${String(hold.secondsLeft % 60).padStart(2, '0')}`;

  function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (email) login(email.trim(), name);
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !date || !time) return;
    if (name.trim().length < 2) return setError('Enter the name of the person leading the trip.');
    if (!/^\+?\d[\d\s-]{7,14}$/.test(phone.trim())) return setError('Enter a mobile number the captain can reach you on, for example 012-345 6789.');
    if (!agreed) return setError('Please accept the cancellation policy and booking terms to continue.');
    setError('');
    setSubmitting(true);

    const booking: Booking = {
      ref: newReference(),
      tripId: trip.id,
      userEmail: user.email,
      date,
      time,
      anglers,
      organiserName: name.trim(),
      organiserPhone: phone.trim(),
      notes: notes.trim(),
      priceSen: q.priceSen,
      serviceFeeSen: q.serviceFeeSen,
      totalSen: q.totalSen,
      paidSen: payNow,
      payOption,
      method,
      status: trip.instantBooking ? 'CONFIRMED' : 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };
    addBooking(booking);
    updateProfile({ phone: phone.trim() });
    router.replace(`/bookings/${booking.ref}?new=1`);
  }

  return (
    <div className="container page checkout">
      <Link href={back} className="back-link"><Icon name="left" size={16} /> Back to trip</Link>
      <h1>{trip.instantBooking ? 'Confirm and pay' : 'Request to book'}</h1>

      <div className={`notice ${expired ? 'warn' : 'info'}`} role="status">
        <Icon name="clock" />
        {expired ? (
          <span>Your hold on this departure ran out. <button className="link-btn" onClick={hold.renew}>Hold it again</button></span>
        ) : (
          <span>We are holding this departure for you for <strong>{clock}</strong>. Nobody else can book it while you check out.</span>
        )}
      </div>

      <div className="checkout-grid">
        <div>
          <section className="step">
            <h2><span className="step-num">{user ? <Icon name="check" size={14} /> : 1}</span> Log in or sign up</h2>
            {user ? (
              <p className="muted">Booking as <strong>{user.name}</strong> ({user.email})</p>
            ) : (
              <form onSubmit={signIn} className="form">
                <label className="field"><span>Email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
                <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>
                <button className="btn btn-primary" type="submit">Continue</button>
                <p className="muted small">Prototype sign-in: no password is needed and no email is sent.</p>
              </form>
            )}
          </section>

          <form onSubmit={confirm} className={user ? '' : 'locked'} aria-disabled={!user} noValidate>
            <fieldset disabled={!user || expired} className="plain">
              <section className="step">
                <h2><span className="step-num">2</span> Who is leading the trip?</h2>
                <div className="form two">
                  <label className="field"><span>Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                  <label className="field"><span>Mobile number</span><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012-345 6789" autoComplete="tel" /></label>
                </div>
                <label className="field"><span>Note for the captain (optional)</span><textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="First-timers in the group, target fish, anything the crew should know" /></label>
              </section>

              <section className="step">
                <h2><span className="step-num">3</span> Payment</h2>
                {trip.depositPct > 0 && (
                  <div className="choices" role="radiogroup" aria-label="How much to pay now">
                    <label className={`choice${payOption === 'full' ? ' on' : ''}`}>
                      <input type="radio" name="pay" checked={payOption === 'full'} onChange={() => setPayOption('full')} />
                      <span><strong>Pay in full</strong><small>{formatMyr(q.totalSen)} now, nothing to settle at the jetty</small></span>
                    </label>
                    <label className={`choice${payOption === 'deposit' ? ' on' : ''}`}>
                      <input type="radio" name="pay" checked={payOption === 'deposit'} onChange={() => setPayOption('deposit')} />
                      <span><strong>Pay a {trip.depositPct}% deposit</strong><small>{formatMyr(q.depositSen)} now, {formatMyr(q.totalSen - q.depositSen)} charged 3 days before the trip</small></span>
                    </label>
                  </div>
                )}
                <h3>Pay with</h3>
                <div className="choices" role="radiogroup" aria-label="Payment method">
                  {(Object.keys(METHODS) as PaymentMethod[]).map((m) => (
                    <label key={m} className={`choice${method === m ? ' on' : ''}`}>
                      <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                      <span><strong>{METHODS[m].label}</strong><small>{METHODS[m].hint}</small></span>
                    </label>
                  ))}
                </div>
                <p className="muted small">Prototype: no payment details are collected and nothing is charged.</p>
              </section>

              <section className="step">
                <h2><span className="step-num">4</span> Cancellation policy</h2>
                <p><strong>{policy.label}.</strong> {policy.summary}</p>
                <p className="muted">{WEATHER_PROMISE}</p>
                {!trip.instantBooking && <p className="muted">{trip.operator.name} has 24 hours to accept. Your payment is only taken if they do, and the hold is released if they decline.</p>}
                <label className="check">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>I accept the cancellation policy and the booking terms.</span>
                </label>
              </section>

              {error && <p className="notice warn" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
                {trip.instantBooking ? `Confirm and pay ${formatMyr(payNow)}` : `Request to book · ${formatMyr(payNow)}`}
              </button>
            </fieldset>
          </form>
        </div>

        <aside className="summary">
          <div className="summary-trip">
            <TripPhoto src={trip.images[0]!} alt="" />
            <div>
              <strong>{trip.title}</strong>
              <span className="muted small">{trip.operator.name}</span>
              <span className="small"><Rating trip={trip} size={12} /></span>
            </div>
          </div>
          <dl className="summary-facts">
            <div><dt>Date</dt><dd>{formatDate(date!, 'long')}</dd></div>
            <div><dt>Departure</dt><dd>{formatTime(time!)} from {trip.jetty}</dd></div>
            <div><dt>Anglers</dt><dd>{anglers} <Link href={back} className="link small">Change</Link></dd></div>
          </dl>
          <dl className="price-lines">
            <div><dt>Boat charter</dt><dd>{formatMyr(q.priceSen)}</dd></div>
            <div><dt>Service fee</dt><dd>{formatMyr(q.serviceFeeSen)}</dd></div>
            <div className="total"><dt>Total (MYR)</dt><dd>{formatMyr(q.totalSen)}</dd></div>
            <div><dt>{trip.instantBooking ? 'Due now' : 'Due if accepted'}</dt><dd>{formatMyr(payNow)}</dd></div>
            {payNow < q.totalSen && <div className="muted"><dt>Due 3 days before</dt><dd>{formatMyr(q.totalSen - payNow)}</dd></div>}
          </dl>
        </aside>
      </div>
    </div>
  );
}
