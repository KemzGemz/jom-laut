'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { safeNext, useStore } from '@/lib/store';

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useStore();
  const signup = params.get('mode') === 'signup';
  const next = safeNext(params.get('next'));
  const nextQuery = next === '/' ? '' : `next=${encodeURIComponent(next)}`;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    login(email.trim(), name);
    router.replace(next);
  }

  return (
    <div className="container page auth">
      <form className="card form" onSubmit={submit}>
        <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">{signup ? 'Book trips, save boats and keep every booking in one place.' : 'Log in to manage your bookings and wishlist.'}</p>
        {signup && (
          <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required /></label>
        )}
        <label className="field"><span>Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
        <button type="submit" className="btn btn-primary btn-block">{signup ? 'Sign up' : 'Continue'}</button>
        <p className="muted small">Prototype sign-in: no password is needed and no email is sent.</p>
        <hr />
        <p className="muted">
          {signup
            ? <>Already have an account? <Link className="link" href={`/login${nextQuery && `?${nextQuery}`}`}>Log in</Link></>
            : <>New to AngleX? <Link className="link" href={`/login?mode=signup${nextQuery && `&${nextQuery}`}`}>Sign up</Link></>}
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container page muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
