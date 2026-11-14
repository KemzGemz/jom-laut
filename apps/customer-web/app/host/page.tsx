'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/Icon';

const STEPS = [
  ['Tell us about your boat', 'Jetty, boat size, the trips you run and your price per boat.'],
  ['Get verified', 'We check your boat licence and identity before your listing goes live.'],
  ['Open your calendar', 'Mark the dates you are free. Anglers can only book what you have opened.'],
  ['Get paid', 'Payment is collected at booking and paid out to you after each trip.'],
];

export default function HostPage() {
  const [sent, setSent] = useState(false);

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
          <p className="host-demo">Already listed with us? <Link className="link" href="/operator">Open the operator dashboard</Link></p>
        </div>

        <form className="card form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          {sent ? (
            <div className="empty compact" role="status">
              <Icon name="check" size={32} />
              <h2>Thanks, we will be in touch</h2>
              <p className="muted">Operator onboarding opens jetty by jetty. Our team will call you to set up your first listing.</p>
            </div>
          ) : (
            <>
              <h2>Register your interest</h2>
              <label className="field"><span>Your name</span><input className="input" required autoComplete="name" /></label>
              <label className="field"><span>Mobile number</span><input className="input" type="tel" required placeholder="012-345 6789" autoComplete="tel" /></label>
              <label className="field"><span>Home jetty</span><input className="input" required placeholder="Jeti Marang, Terengganu" /></label>
              <button className="btn btn-primary btn-block" type="submit">Register interest</button>
              <p className="muted small">Prototype: this form does not send your details anywhere.</p>
            </>
          )}
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
