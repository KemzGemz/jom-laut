'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useStore } from '@/lib/store';

export default function AccountPage() {
  const { user, ready, updateProfile, logout } = useStore();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? '');
    }
  }, [user]);

  if (!ready) return <div className="container page muted">Loading…</div>;
  if (!user) return <div className="container page narrow"><SignInPrompt title="Log in to manage your account" next="/account" /></div>;

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateProfile({ name: name.trim() || user!.name, phone: phone.trim() || undefined });
    setSaved(true);
  }

  return (
    <div className="container page auth">
      <form className="card form" onSubmit={save}>
        <h1>Account</h1>
        <label className="field"><span>Email</span><input className="input" value={user.email} disabled /></label>
        <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} autoComplete="name" /></label>
        <label className="field"><span>Mobile number</span><input className="input" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} placeholder="012-345 6789" autoComplete="tel" /></label>
        <button type="submit" className="btn btn-primary">Save changes</button>
        {saved && <p className="notice info" role="status">Saved.</p>}
        <hr />
        <button type="button" className="btn btn-outline" onClick={() => { logout(); router.push('/'); }}>Log out</button>
      </form>
    </div>
  );
}
