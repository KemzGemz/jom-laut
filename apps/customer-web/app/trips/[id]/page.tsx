import type { Metadata } from 'next';
import { isISODate } from '@/lib/dates';
import { getTrip } from '@/lib/repo';
import { TripView } from './TripView';

interface Props {
  params: { id: string };
  searchParams: { date?: string; anglers?: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return { title: getTrip(params.id)?.title ?? 'Trip' };
}

export default function TripPage({ params, searchParams }: Props) {
  return (
    <TripView
      id={params.id}
      base={getTrip(params.id)}
      initialDate={isISODate(searchParams.date) ? searchParams.date : undefined}
      initialAnglers={Number(searchParams.anglers) || undefined}
    />
  );
}
