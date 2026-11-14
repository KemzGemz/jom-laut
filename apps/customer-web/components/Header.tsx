'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Icon } from './Icon';

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="AngleX home">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path d="M6 17s4-6 10-6 8 6 8 6-2 6-8 6-10-6-10-6z" fill="#fff" />
        <path d="m23.5 17 3.5-4v8z" fill="#fff" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      </svg>
      AngleX
    </Link>
  );
}

export function Header() {
  const { user, ready, logout, bookings, operatorId } = useStore();
  const [open, setOpen] = useState<'menu' | 'lang' | null>(null);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  // One link changes with where you are: into the operator side, or back out of it.
  const inOperator = pathname.startsWith('/operator');
  const hostLink = inOperator
    ? { href: '/', label: 'Switch to booking trips' }
    : ready && operatorId
      ? { href: '/operator', label: 'Operator dashboard' }
      : { href: '/host', label: 'List your boat' };

  const upcoming = user ? bookings.filter((b) => b.userEmail === user.email && b.status !== 'CANCELLED').length : 0;

  return (
    <header className="header">
      <div className="container header-inner">
        <Logo />
        <div className="header-right" ref={ref}>
          <Link href={hostLink.href} className="ghost-link hide-sm">{hostLink.label}</Link>

          <div className="pop-anchor">
            <button className="icon-btn" aria-label="Language" aria-expanded={open === 'lang'} onClick={() => setOpen(open === 'lang' ? null : 'lang')}>
              <Icon name="globe" />
            </button>
            {open === 'lang' && (
              <div className="popover menu" role="menu">
                <div className="menu-item current"><Icon name="check" size={16} /> English</div>
                <div className="menu-item disabled">Bahasa Melayu <span className="tag">Soon</span></div>
              </div>
            )}
          </div>

          <div className="pop-anchor">
            <button className="user-trigger" aria-label="Account menu" aria-expanded={open === 'menu'} onClick={() => setOpen(open === 'menu' ? null : 'menu')}>
              <Icon name="menu" size={16} />
              <span className="avatar">{ready && user ? user.name.charAt(0).toUpperCase() : <Icon name="user" size={16} />}</span>
            </button>
            {open === 'menu' && (
              <div className="popover menu" role="menu">
                {user ? (
                  <>
                    <div className="menu-head">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Link className="menu-item" href="/bookings">My bookings {upcoming > 0 && <span className="tag">{upcoming}</span>}</Link>
                    <Link className="menu-item" href="/wishlist">Wishlist</Link>
                    <Link className="menu-item" href="/account">Account</Link>
                    <div className="menu-sep" />
                    <Link className="menu-item" href={hostLink.href}>{hostLink.label}</Link>
                    <button className="menu-item" onClick={() => { logout(); setOpen(null); }}>Log out</button>
                  </>
                ) : (
                  <>
                    <Link className="menu-item strong" href="/login?mode=signup">Sign up</Link>
                    <Link className="menu-item" href="/login">Log in</Link>
                    <div className="menu-sep" />
                    <Link className="menu-item" href="/wishlist">Wishlist</Link>
                    <Link className="menu-item" href={hostLink.href}>{hostLink.label}</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} AngleX · Fishing trips and boat charters in Malaysia</span>
        <nav>
          <Link href="/host">List your boat</Link>
          <Link href="/operator">Operator dashboard</Link>
          <Link href="/bookings">My bookings</Link>
        </nav>
      </div>
    </footer>
  );
}
