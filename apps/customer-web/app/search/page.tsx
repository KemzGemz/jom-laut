import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchResults } from './SearchResults';

export const metadata: Metadata = { title: 'Search trips' };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container page muted">Loading trips…</div>}>
      <SearchResults />
    </Suspense>
  );
}
