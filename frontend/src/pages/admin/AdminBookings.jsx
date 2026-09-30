import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../../api';
import { PLAN_LABEL, fdate, money } from '../../lib/format';
import { Empty, Field, LoadState, PageHeader, Pagination, Select, StatusBadge, cx, useFetch } from '../../components/ui';

function BookingsTab() {
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => api.get(`/admin/bookings${qs({ status, plan_type: plan, page, limit: 15 })}`).then((r) => r.data), [status, plan, page]);
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-[12rem_12rem]">
        <Field label="Status"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="rejected">Declined</option></Select></Field>
        <Field label="Plan"><Select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}><option value="">All</option>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      </div>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.bookings.length === 0 ? <Empty title="No bookings match" /> : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-soft"><tr><th className="px-4 py-3 font-semibold">Booking</th><th className="px-4 py-3 font-semibold">Household</th><th className="px-4 py-3 font-semibold">Helper</th><th className="px-4 py-3 font-semibold">Dates</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Status</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data?.bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-wash">
                    <td className="px-4 py-3"><Link to={`/bookings/${b.id}`} className="font-semibold underline">#{b.id}</Link> <span className="text-ink-soft">{PLAN_LABEL[b.plan_type]}</span></td>
                    <td className="px-4 py-3">{b.household_name}</td>
                    <td className="px-4 py-3">{b.helper_name}</td>
                    <td className="px-4 py-3">{fdate(b.start_date)}{b.end_date !== b.start_date && ` to ${fdate(b.end_date)}`}</td>
                    <td className="px-4 py-3">{money(b.total_price)}</td>
                    <td className="px-4 py-3"><StatusBadge value={b.phase} kind="booking" />{b.status === 'cancelled' && <span className="ml-1 text-xs text-ink-soft">by {b.cancelled_by}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </>
  );
}

function AttendanceTab() {
  const [status, setStatus] = useState('absent');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => api.get(`/admin/attendance${qs({ status, page, limit: 15 })}`).then((r) => r.data), [status, page]);
  return (
    <>
      <div className="mb-5 max-w-48"><Field label="Show"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="absent">Absences</option><option value="present">Present days</option><option value="">Everything</option></Select></Field></div>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.attendance.length === 0 ? <Empty title="No attendance records" /> : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
            {data?.attendance.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span><span className="font-semibold">{a.helper_name}</span> at {a.household_name} <span className="text-ink-soft">on {fdate(a.work_date)}{a.note && ` - ${a.note}`}</span></span>
                <span className="flex items-center gap-3"><Link to={`/bookings/${a.booking_id}`} className="text-xs font-semibold underline">Booking #{a.booking_id}</Link><StatusBadge value={a.status} /></span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </>
  );
}

export default function AdminBookings() {
  const [tab, setTab] = useState('bookings');
  return (
    <div>
      <PageHeader title="Bookings and attendance" sub="Monitor requests, cancellations and whether helpers turn up." />
      <div className="mb-5 flex gap-2" role="tablist">
        {[['bookings', 'Bookings'], ['attendance', 'Attendance']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('rounded-full border px-4 py-1.5 text-sm font-semibold', tab === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-wash')}>{l}</button>
        ))}
      </div>
      {tab === 'bookings' ? <BookingsTab /> : <AttendanceTab />}
    </div>
  );
}
