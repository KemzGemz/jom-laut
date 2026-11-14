import type { CancellationPolicy, PayOption, Trip } from './types';

export const SERVICE_FEE_PCT = 5;

/** "RM450", or "RM472.50" when there are sen to show. */
export function formatMyr(sen: number): string {
  const ringgit = Math.floor(sen / 100).toLocaleString('en-MY');
  const cents = sen % 100;
  return cents === 0 ? `RM${ringgit}` : `RM${ringgit}.${String(cents).padStart(2, '0')}`;
}

export interface Quote {
  priceSen: number;
  serviceFeeSen: number;
  totalSen: number;
  depositSen: number;
}

export function quote(trip: Trip): Quote {
  const serviceFeeSen = Math.round((trip.priceSen * SERVICE_FEE_PCT) / 100);
  const totalSen = trip.priceSen + serviceFeeSen;
  const depositSen = trip.depositPct > 0 ? Math.round((totalSen * trip.depositPct) / 100) : totalSen;
  return { priceSen: trip.priceSen, serviceFeeSen, totalSen, depositSen };
}

export function dueNow(q: Quote, option: PayOption): number {
  return option === 'deposit' ? q.depositSen : q.totalSen;
}

interface PolicyRule {
  /** Applies when the trip is at least this many days away. */
  minDays: number;
  refundPct: number;
}

export const POLICIES: Record<CancellationPolicy, { label: string; summary: string; rules: PolicyRule[] }> = {
  flexible: {
    label: 'Flexible',
    summary: 'Full refund up to 2 days before departure.',
    rules: [{ minDays: 2, refundPct: 100 }],
  },
  moderate: {
    label: 'Moderate',
    summary: 'Full refund up to 7 days before departure, 50% up to 2 days before.',
    rules: [
      { minDays: 7, refundPct: 100 },
      { minDays: 2, refundPct: 50 },
    ],
  },
  strict: {
    label: 'Strict',
    summary: '50% refund up to 14 days before departure. No refund after that.',
    rules: [{ minDays: 14, refundPct: 50 }],
  },
};

export const WEATHER_PROMISE =
  'If the captain cancels for bad weather or safety, you choose a free reschedule or a full refund.';

/** Refund owed when the customer cancels `daysBefore` days ahead of departure. */
export function refundFor(policy: CancellationPolicy, daysBefore: number, paidSen: number): number {
  const rule = POLICIES[policy].rules.find((r) => daysBefore >= r.minDays);
  return rule ? Math.round((paidSen * rule.refundPct) / 100) : 0;
}
