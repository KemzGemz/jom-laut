import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { SearchBar } from '@/components/SearchBar';
import { TripCard } from '@/components/TripCard';
import { formatDate, upcomingWeekend } from '@/lib/dates';
import { popularTrips, searchTrips } from '@/lib/repo';
import { TRIP_TYPE_LABELS, type TripType } from '@/lib/types';

// The weekend rows depend on today's date.
export const dynamic = 'force-dynamic';

const WEEKEND_STATES = ['Terengganu', 'Pahang', 'Selangor'];

export default function HomePage() {
  const weekend = upcomingWeekend();
  const saturday = weekend[0]!;
  const weekendLabel = weekend.map((d) => formatDate(d)).join(' and ');

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Find your next fishing trip</h1>
          <p>Fishing trips and charters across Malaysia with real availability, clear prices and a booking record.</p>
          <SearchBar />
          <nav className="chips" aria-label="Trip types">
            {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((type) => (
              <Link key={type} className="chip" href={`/search?types=${type}`}>{TRIP_TYPE_LABELS[type]}</Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <div className="section-head">
            <h2>Popular trips</h2>
            <Link href="/search" className="link">See all trips</Link>
          </div>
          <div className="trip-row">
            {popularTrips().map((t) => <TripCard key={t.id} trip={t} />)}
          </div>
        </section>

        {WEEKEND_STATES.map((state) => {
          const trips = searchTrips({ state, date: saturday }).slice(0, 8);
          if (trips.length === 0) return null;
          return (
            <section className="section" key={state}>
              <div className="section-head">
                <div>
                  <h2>Free this weekend in {state}</h2>
                  <p className="muted">{weekendLabel}</p>
                </div>
                <Link href={`/search?state=${encodeURIComponent(state)}&date=${saturday}`} className="link">See all</Link>
              </div>
              <div className="trip-row">
                {trips.map((t) => <TripCard key={t.id} trip={t} date={saturday} />)}
              </div>
            </section>
          );
        })}

        <section className="section trust">
          <div><Icon name="calendar" size={22} /><h3>Real availability</h3><p className="muted">Pick a date the boat is actually free. It is held for you while you check out.</p></div>
          <div><Icon name="shield" size={22} /><h3>Verified operators</h3><p className="muted">Captains are checked before they list, and every review comes from a completed trip.</p></div>
          <div><Icon name="fish" size={22} /><h3>One clear price</h3><p className="muted">Boat, crew and fuel in one total, with the cancellation policy shown before you pay.</p></div>
        </section>
      </div>
    </>
  );
}
