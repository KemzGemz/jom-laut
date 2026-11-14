'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { SearchBar } from '@/components/SearchBar';
import { TripCard } from '@/components/TripCard';
import { formatDate, isISODate } from '@/lib/dates';
import { useMarket } from '@/lib/live';
import { formatMyr } from '@/lib/pricing';
import { PRICE_CEILING_SEN, searchTrips } from '@/lib/repo';
import { TRIP_TYPE_LABELS, type SearchQuery, type SortKey, type TripType } from '@/lib/types';

const SORTS: Record<SortKey, string> = {
  recommended: 'Recommended',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Top rated',
  boat_size: 'Biggest boat',
};
const PRICE_MAX_RM = PRICE_CEILING_SEN / 100;
const FILTER_KEYS = ['types', 'instant', 'bathroom', 'maxPrice', 'minBoat'];

export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The URL is the single source of truth, so every search is shareable.
  const query = useMemo<SearchQuery>(() => {
    const date = params.get('date');
    const types = (params.get('types') ?? '').split(',').filter((t): t is TripType => t in TRIP_TYPE_LABELS);
    const sort = params.get('sort');
    return {
      state: params.get('state') ?? undefined,
      district: params.get('district') ?? undefined,
      date: isISODate(date) ? date : undefined,
      anglers: Number(params.get('anglers')) || undefined,
      types,
      instantOnly: params.get('instant') === '1',
      bathroomOnly: params.get('bathroom') === '1',
      maxPriceSen: params.get('maxPrice') ? Number(params.get('maxPrice')) * 100 : undefined,
      minBoatFt: Number(params.get('minBoat')) || undefined,
      sort: sort && sort in SORTS ? (sort as SortKey) : 'recommended',
    };
  }, [params]);

  const market = useMarket();
  const results = useMemo(() => searchTrips(query, market), [query, market]);

  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function toggleType(type: TripType) {
    const types = query.types ?? [];
    const next = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
    update({ types: next.join(',') || undefined });
  }

  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;
  const where = query.district ?? query.state ?? 'Malaysia';
  const maxPriceRm = query.maxPriceSen !== undefined ? query.maxPriceSen / 100 : PRICE_MAX_RM;
  const searchKey = `${query.state}|${query.district}|${query.date}|${query.anglers}`;

  return (
    <div className="container page">
      <SearchBar
        key={searchKey}
        initial={{ state: query.state, district: query.district, date: query.date, anglers: query.anglers }}
        preserve={params.toString()}
      />

      <div className="search-layout">
        <aside className={`filters${filtersOpen ? ' open' : ''}`} aria-label="Filters">
          <div className="row-between">
            <h2>Filters</h2>
            {activeFilters > 0 && (
              <button className="link-btn" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))}>Clear all</button>
            )}
          </div>

          <fieldset>
            <legend>Trip type</legend>
            <div className="chips wrap">
              {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((type) => (
                <button key={type} type="button" className={`chip${query.types?.includes(type) ? ' on' : ''}`} aria-pressed={query.types?.includes(type)} onClick={() => toggleType(type)}>
                  {TRIP_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Booking</legend>
            <label className="check">
              <input type="checkbox" checked={!!query.instantOnly} onChange={(e) => update({ instant: e.target.checked ? '1' : undefined })} />
              <span><strong>Instant book</strong><small>Confirmed without waiting for the operator</small></span>
            </label>
            <label className="check">
              <input type="checkbox" checked={!!query.bathroomOnly} onChange={(e) => update({ bathroom: e.target.checked ? '1' : undefined })} />
              <span><strong>Toilet on board</strong><small>Useful for long days and family trips</small></span>
            </label>
          </fieldset>

          <fieldset>
            <legend>Price per boat: up to {formatMyr(maxPriceRm * 100)}</legend>
            <input
              type="range" min={300} max={PRICE_MAX_RM} step={50} value={maxPriceRm} aria-label="Maximum price"
              onChange={(e) => update({ maxPrice: Number(e.target.value) >= PRICE_MAX_RM ? undefined : e.target.value })}
            />
          </fieldset>

          <fieldset>
            <legend>Boat length: {query.minBoatFt ? `${query.minBoatFt} ft or longer` : 'any'}</legend>
            <input
              type="range" min={0} max={40} step={2} value={query.minBoatFt ?? 0} aria-label="Minimum boat length"
              onChange={(e) => update({ minBoat: e.target.value === '0' ? undefined : e.target.value })}
            />
          </fieldset>
        </aside>

        <section>
          <div className="toolbar">
            <div>
              <h1>Trips in {where}</h1>
              <p className="muted">
                {results.length} trip{results.length === 1 ? '' : 's'}
                {query.date && ` available ${formatDate(query.date)}`}
                {query.anglers && ` for ${query.anglers} angler${query.anglers === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="toolbar-actions">
              <button className="btn btn-outline show-md" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
                <Icon name="sliders" size={16} /> Filters{activeFilters > 0 && ` (${activeFilters})`}
              </button>
              <select className="input" aria-label="Sort by" value={query.sort} onChange={(e) => update({ sort: e.target.value === 'recommended' ? undefined : e.target.value })}>
                {Object.entries(SORTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>

          {results.length > 0 ? (
            <div className="trip-grid">
              {results.map((t) => <TripCard key={t.id} trip={t} date={query.date} anglers={query.anglers} />)}
            </div>
          ) : (
            <div className="empty">
              <Icon name="fish" size={32} />
              <h2>No trips match that search</h2>
              <p className="muted">Try another date, fewer filters, or a wider area.</p>
              <div className="empty-actions">
                {query.date && <button className="btn btn-outline" onClick={() => update({ date: undefined })}>Any date</button>}
                {activeFilters > 0 && <button className="btn btn-outline" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))}>Clear filters</button>}
                {query.district && <button className="btn btn-outline" onClick={() => update({ district: undefined })}>All of {query.state}</button>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
