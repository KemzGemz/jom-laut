'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { stageOf } from '@/lib/bookings';
import { useMarket, useOperator } from '@/lib/live';
import { operators } from '@/lib/market';
import { useStore } from '@/lib/store';

const NAV = [
  ['/operator', 'Overview'],
  ['/operator/bookings', 'Bookings'],
  ['/operator/calendar', 'Calendar'],
  ['/operator/listings', 'Listings'],
  ['/operator/earnings', 'Earnings'],
] as const;

function AccountPicker() {
  const { setOperator } = useStore();
  const { trips } = useMarket();
  return (
    <div className="container page narrow">
      <h1>Operator dashboard</h1>
      <p className="muted op-intro">
        Prototype: choose a sample operator to see their side of AngleX. Real operators will sign in with their own account.
      </p>
      <ul className="op-accounts">
        {operators(trips).map((o) => (
          <li key={o.id}>
            <button className="op-account" onClick={() => setOperator(o.id)}>
              <span className="avatar">{o.name.charAt(0)}</span>
              <span className="op-account-text">
                <strong>{o.name}</strong>
                <span className="muted small">{o.home} · {o.listings.length} listing{o.listings.length === 1 ? '' : 's'}</span>
              </span>
              <Icon name="right" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OperatorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setOperator } = useStore();
  const { ready, account, bookings } = useOperator();

  if (!ready) return <div className="container page muted">Loading…</div>;
  if (!account) return <AccountPicker />;

  const waiting = bookings.filter((b) => stageOf(b) === 'pending').length;
  const isOn = (href: string) => (href === '/operator' ? pathname === href : pathname.startsWith(href));

  return (
    <>
      <div className="op-bar">
        <div className="container op-bar-inner">
          <div className="op-who">
            <span className="avatar">{account.name.charAt(0)}</span>
            <div>
              <strong>{account.name}</strong>
              <span className="muted small">{account.home} · <button className="link-btn small" onClick={() => setOperator(null)}>Switch operator</button></span>
            </div>
          </div>
          <nav className="op-nav" aria-label="Operator">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className={`tab${isOn(href) ? ' on' : ''}`} aria-current={isOn(href) ? 'page' : undefined}>
                {label} {href === '/operator/bookings' && waiting > 0 && <span className="tag alert">{waiting}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
