import Link from 'next/link';
import { Icon } from '@/components/Icon';

export default function NotFound() {
  return (
    <div className="container page narrow">
      <div className="empty">
        <Icon name="fish" size={32} />
        <h1>This one got away</h1>
        <p className="muted">The page you are looking for does not exist or the trip is no longer listed.</p>
        <div className="empty-actions">
          <Link className="btn btn-primary" href="/search">Browse trips</Link>
          <Link className="btn btn-outline" href="/">Home</Link>
        </div>
      </div>
    </div>
  );
}
