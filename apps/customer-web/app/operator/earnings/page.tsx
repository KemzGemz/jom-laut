'use client';

import Link from 'next/link';
import { stageOf } from '@/lib/bookings';
import { formatDate, fromISO, today } from '@/lib/dates';
import { HISTORY_DAYS, useOperator } from '@/lib/live';
import { COMMISSION_PCT, payoutOf } from '@/lib/market';
import { formatMyr } from '@/lib/pricing';

const MONTH = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' });

export default function OperatorEarnings() {
  const { bookings } = useOperator();
  const thisMonth = today().slice(0, 7);

  const completed = bookings.filter((b) => stageOf(b) === 'completed');
  const upcoming = bookings.filter((b) => stageOf(b) === 'confirmed');
  const sum = (list: typeof bookings) => list.reduce(
    (acc, b) => { const p = payoutOf(b); return { gross: acc.gross + p.grossSen, commission: acc.commission + p.commissionSen, net: acc.net + p.netSen }; },
    { gross: 0, commission: 0, net: 0 },
  );

  const months = [...new Set(completed.map((b) => b.date.slice(0, 7)))].sort().reverse();
  const recent = [...completed].reverse().slice(0, 8);

  return (
    <div className="container page narrow">
      <h1>Earnings</h1>
      <ul className="stats three">
        <li><span>Earned this month</span><strong>{formatMyr(sum(completed.filter((b) => b.date.startsWith(thisMonth))).net)}</strong><span className="muted small">From completed trips</span></li>
        <li><span>Still to come</span><strong>{formatMyr(sum(upcoming).net)}</strong><span className="muted small">{upcoming.length} confirmed trip{upcoming.length === 1 ? '' : 's'}</span></li>
        <li><span>Last {HISTORY_DAYS} days</span><strong>{formatMyr(sum(completed).net)}</strong><span className="muted small">{completed.length} completed trip{completed.length === 1 ? '' : 's'}</span></li>
      </ul>

      <section className="section">
        <h2>By month</h2>
        {months.length === 0 ? <p className="muted op-none">No completed trips yet.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Month</th><th className="num">Trips</th><th className="num">Boat price</th><th className="num">Commission ({COMMISSION_PCT}%)</th><th className="num">Your payout</th></tr></thead>
              <tbody>
                {months.map((m) => {
                  const list = completed.filter((b) => b.date.startsWith(m));
                  const s = sum(list);
                  return (
                    <tr key={m}>
                      <td>{MONTH.format(fromISO(`${m}-01`))}</td>
                      <td className="num">{list.length}</td>
                      <td className="num">{formatMyr(s.gross)}</td>
                      <td className="num">−{formatMyr(s.commission)}</td>
                      <td className="num"><strong>{formatMyr(s.net)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Recent payouts</h2>
        {recent.length === 0 ? <p className="muted op-none">Payouts appear here after each completed trip.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Trip date</th><th>Customer</th><th>Listing</th><th className="num">Payout</th></tr></thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.ref}>
                    <td>{formatDate(b.date)}</td>
                    <td><Link className="link" href={`/operator/bookings/${b.ref}`}>{b.organiserName}</Link></td>
                    <td>{b.trip.title}</td>
                    <td className="num">{formatMyr(payoutOf(b).netSen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small op-fine">Payouts are sent to your bank account 2 working days after each trip. AngleX keeps a {COMMISSION_PCT}% commission on the boat price; the customer's service fee is charged separately and never comes out of your payout.</p>
      </section>
    </div>
  );
}
