import { Link } from 'react-router-dom';
import { api } from '../../api';
import { money } from '../../lib/format';
import { LoadState, PageHeader, Panel, Stat, useFetch } from '../../components/ui';

function Bars({ items }) {
  const max = Math.max(1, ...items.map(([, v]) => v));
  if (!items.length) return <p className="text-sm text-ink-soft">No data yet.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map(([label, v]) => (
        <li key={label} className="text-sm">
          <div className="mb-1 flex justify-between"><span className="capitalize">{label.replace('_', ' ')}</span><span className="font-semibold">{v}</span></div>
          <div className="h-2 rounded-full bg-wash"><div className="h-2 rounded-full bg-ink" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/analytics').then((r) => r.data.analytics), []);
  const k = data?.kpis;
  const trendMax = Math.max(1, ...(data?.trend || []).flatMap((t) => [t.registrations, t.bookings]));

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" sub="How Helper4U is doing across households, helpers and bookings." />
      <LoadState loading={loading} error={error} onRetry={reload}>
        {k && (
          <>
            {(k.pending_verifications > 0 || k.open_complaints > 0) && (
              <div className="flex flex-wrap gap-3">
                {k.pending_verifications > 0 && <Link to="/admin/helpers?status=pending" className="rounded-lg bg-marigold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#e2a400]">{k.pending_verifications} helper{k.pending_verifications > 1 ? 's' : ''} waiting for verification</Link>}
                {k.open_complaints > 0 && <Link to="/admin/complaints" className="rounded-lg border border-ink px-4 py-2.5 text-sm font-semibold hover:bg-wash">{k.open_complaints} open complaint{k.open_complaints > 1 ? 's' : ''}</Link>}
              </div>
            )}

            <section className="grid gap-x-6 gap-y-8 rounded-xl border border-line bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Registered households" value={k.registered_households} />
              <Stat label="Verified helpers" value={k.verified_helpers} sub={`${k.registered_helpers} registered`} />
              <Stat label="Monthly active users" value={k.monthly_active_users} sub="Logged in during the last 30 days" />
              <Stat label="Total bookings" value={k.total_bookings} />
              <Stat label="Booking completion rate" value={`${k.booking_completion_rate}%`} sub="Completed out of completed and cancelled" />
              <Stat label="Acceptance rate" value={`${k.acceptance_rate}%`} sub="Requests helpers said yes to" />
              <Stat label="Customer satisfaction" value={k.customer_satisfaction ? `${k.customer_satisfaction} / 5` : 'No reviews'} sub={`${k.total_reviews} review${k.total_reviews === 1 ? '' : 's'}`} />
              <Stat label="Helper reliability" value={`${k.helper_reliability_score} / 100`} sub="Attendance and kept commitments" />
              <Stat label="Completed booking value" value={money(k.completed_booking_value)} />
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title="Bookings by status"><Bars items={Object.entries(data.bookings_by_status)} /></Panel>
              <Panel title="Bookings by service"><Bars items={Object.entries(data.bookings_by_service)} /></Panel>
              <Panel title="Bookings by plan"><Bars items={Object.entries(data.bookings_by_plan)} /></Panel>
            </div>

            <Panel title="Last six months" sub="New accounts and new bookings each month">
              <div className="flex items-end gap-4 overflow-x-auto pb-1" role="img" aria-label="Monthly registrations and bookings">
                {data.trend.map((t) => (
                  <div key={t.month} className="flex min-w-16 flex-1 flex-col items-center gap-2">
                    <div className="flex h-32 items-end gap-1.5">
                      <div className="w-5 rounded-t bg-ink" style={{ height: `${(t.registrations / trendMax) * 100}%`, minHeight: t.registrations ? 4 : 0 }} title={`${t.registrations} registrations`} />
                      <div className="w-5 rounded-t bg-marigold" style={{ height: `${(t.bookings / trendMax) * 100}%`, minHeight: t.bookings ? 4 : 0 }} title={`${t.bookings} bookings`} />
                    </div>
                    <div className="text-xs text-ink-soft">{t.month}</div>
                    <div className="text-xs font-semibold">{t.registrations} / {t.bookings}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-5 text-xs text-ink-soft"><span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded bg-ink" /> New accounts</span><span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded bg-marigold" /> New bookings</span></div>
            </Panel>
          </>
        )}
      </LoadState>
    </div>
  );
}
