/**
 * Calendar-date helpers. Dates travel through the app as local `YYYY-MM-DD`
 * strings so they never shift across the UTC boundary.
 */
export type ISODate = string;

export function toISO(d: Date): ISODate {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISO(iso: ISODate): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isISODate(value: string | null | undefined): value is ISODate {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromISO(value).getTime());
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

/** Stable day number, used to seed availability. */
export function dayNumber(iso: ISODate): number {
  const d = fromISO(iso);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

const SHORT = new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short' });
const LONG = new Intl.DateTimeFormat('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(iso: ISODate, style: 'short' | 'long' = 'short'): string {
  return (style === 'long' ? LONG : SHORT).format(fromISO(iso));
}

/** "07:00" -> "7:00 am" */
export function formatTime(time: string): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** The next weekend days that can still be booked, i.e. strictly after `from`. */
export function upcomingWeekend(from: ISODate = today()): ISODate[] {
  const dow = fromISO(from).getDay();
  if (dow === 6) return [addDays(from, 1)];
  const saturday = addDays(from, dow === 0 ? 6 : 6 - dow);
  return [saturday, addDays(saturday, 1)];
}
