import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTrip } from '@/lib/repo';
import { Checkout } from './Checkout';

interface Props {
  params: { id: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return { title: getTrip(params.id)?.instantBooking === false ? 'Request to book' : 'Confirm and pay' };
}

export default function BookPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container page muted">Loading…</div>}>
      <Checkout id={params.id} base={getTrip(params.id)} />
    </Suspense>
  );
}
