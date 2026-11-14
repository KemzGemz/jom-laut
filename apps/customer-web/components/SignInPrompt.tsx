import Link from 'next/link';
import { Icon } from './Icon';

export function SignInPrompt({ title, next }: { title: string; next: string }) {
  return (
    <div className="empty">
      <Icon name="user" size={32} />
      <h1>{title}</h1>
      <p className="muted">Log in to pick up where you left off.</p>
      <div className="empty-actions">
        <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
        <Link className="btn btn-outline" href={`/login?mode=signup&next=${encodeURIComponent(next)}`}>Sign up</Link>
      </div>
    </div>
  );
}
