'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useMarket } from '@/lib/live';
import { operators } from '@/lib/market';
import { locations } from '@/lib/repo';
import { useStore } from '@/lib/store';

const STEPS = [
  ['Tell us about your boat', 'Your jetty and boat now; the trips you run and your price in the next step.'],
  ['Get verified', 'We check your boat licence and identity. You can set up listings while we do.'],
  ['Open your calendar', 'Close the dates you are not free. Anglers can only book what is open.'],
  ['Get paid', 'Payment is collected at booking and paid out to you after each trip.'],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function HostPage() {
  const router = useRouter();
  const { addAccount, operatorId, ready } = useStore();
  const { trips, state } = useMarket();
  const districts = useMemo(() => locations().filter((o) => o.district), []);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', area: '', jetty: '', boatName: '', boatSizeFt: '' });
  const [error, setError] = useState('');
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  function register(e: React.FormEvent) {
    e.preventDefault();
    const area = districts.find((o) => o.label === form.area);
    const size = Number(form.boatSizeFt);
    if (form.name.trim().length < 3) return setError('Enter the name anglers will see, for example "Kapas Anglers".');
    if (form.contactName.trim().length < 2) return setError('Enter your own name.');
    if (!/^\+?\d[\d\s-]{7,14}$/.test(form.phone.trim())) return setError('Enter a mobile number, for example 012-345 6789.');
    if (!area?.district) return setError('Choose the area you operate from.');
    if (form.jetty.trim().length < 3) return setError('Enter the jetty your trips leave from.');
    if (form.boatName.trim().length < 2 || !(size >= 10 && size <= 80)) return setError('Enter your boat name and its length in feet (10 to 80).');

    const taken = new Set(operators(trips, state.accounts).map((o) => o.id));
    let id = slug(form.name) || 'operator';
    for (let n = 2; taken.has(id); n += 1) id = `${slug(form.name)}-${n}`;

    addAccount({
      id,
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      state: area.state,
      district: area.district,
      jetty: form.jetty.trim(),
      boatName: form.boatName.trim(),
      boatSizeFt: Math.round(size),
    });
    router.push('/operator');
  }

  return (
    <div className="container page host">
      <section className="host-hero">
        <div>
          <h1>Fill your boat without living in WhatsApp.</h1>
          <p className="lead">List your fishing trips on AngleX. Anglers see your real calendar and price, book a free date and pay upfront. You just turn up at the jetty.</p>
          <ul className="ticks">
            <li><Icon name="check" size={16} /> Free to list. A commission applies only on completed bookings.</li>
            <li><Icon name="check" size={16} /> One calendar, so no more double bookings.</li>
            <li><Icon name="check" size={16} /> Choose instant booking or approve each request yourself.</li>
          </ul>
          <p className="host-demo">
            {ready && operatorId ? 'You are already set up. ' : 'Already listed with us? '}
            <Link className="link" href="/operator">Open the operator dashboard</Link>
          </p>
        </div>

        <form className="card form" onSubmit={register} noValidate>
          <h2>List your boat</h2>
          <label className="field"><span>Business or boat operator name</span><input className="input" {...field('name')} placeholder="Kapas Anglers" autoComplete="organization" /></label>
          <div className="form two">
            <label className="field"><span>Your name</span><input className="input" {...field('contactName')} autoComplete="name" /></label>
            <label className="field"><span>Mobile number</span><input className="input" type="tel" {...field('phone')} placeholder="012-345 6789" autoComplete="tel" /></label>
          </div>
          <label className="field">
            <span>Area you operate from</span>
            <select className="input" {...field('area')}>
              <option value="">Choose an area</option>
              {districts.map((o) => <option key={o.label}>{o.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Home jetty</span><input className="input" {...field('jetty')} placeholder="Jeti Marang" /></label>
          <div className="form two">
            <label className="field"><span>Boat name</span><input className="input" {...field('boatName')} placeholder="Sri Kapas" /></label>
            <label className="field"><span>Boat length (ft)</span><input className="input" inputMode="numeric" {...field('boatSizeFt')} placeholder="28" /></label>
          </div>
          {error && <p className="notice warn" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit">Create operator account</button>
          <p className="muted small">Prototype: your details stay in this browser and nothing is sent anywhere.</p>
        </form>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <ol className="how">
          {STEPS.map(([title, body], i) => (
            <li key={title}><span className="step-num">{i + 1}</span><h3>{title}</h3><p className="muted">{body}</p></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
