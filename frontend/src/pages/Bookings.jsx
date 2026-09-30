import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api';
import { useAuth } from '../auth/AuthContext';
import { PLAN_LABEL, fdate, ftime, money } from '../lib/format';
import {
  Empty,
  LoadState,
  PageHeader,
  Pagination,
  StatusBadge,
  cx,
  useFetch,
} from '../components/ui';
import { RespondButtons } from './BookingDetail';

const TABS = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['accepted', 'Accepted'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['rejected', 'Declined'],
];

export default function Bookings() {
  const { user } = useAuth();
  const isHelper = user.role === 'helper';
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(
    () => api.get(`/bookings${qs({ status, page, limit: 10 })}`).then((r) => r.data),
    [status, page],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={isHelper ? 'Your jobs' : 'Your bookings'}
        sub={
          isHelper
            ? 'Booking requests, current jobs and your work history.'
            : 'Track your requests and past services, and leave reviews.'
        }
        actions={
          !isHelper && (
            <Link
              to="/browse"
              className="rounded-lg bg-marigold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#e2a400]"
            >
              Find a helper
            </Link>
          )
        }
      />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map(([v, l]) => (
          <button
            key={l}
            role="tab"
            aria-selected={status === v}
            onClick={() => {
              setStatus(v);
              setPage(1);
            }}
            className={cx(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              status === v ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-wash',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.bookings.length === 0 ? (
          <Empty
            title={
              status
                ? 'Nothing here yet'
                : isHelper
                  ? 'No booking requests yet'
                  : 'You have no bookings yet'
            }
          >
            {isHelper
              ? 'Make sure your profile is verified and your prices are set. Requests will appear here.'
              : 'Browse verified helpers and send your first booking request.'}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {data?.bookings.map((b) => (
              <li key={b.id} className="rounded-xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/bookings/${b.id}`}
                      className="font-display text-lg font-semibold hover:underline"
                    >
                      {isHelper ? b.household_name : b.helper_name}
                    </Link>
                    <div className="text-sm capitalize text-ink-soft">
                      {isHelper
                        ? `${PLAN_LABEL[b.plan_type]} booking`
                        : `${b.service_type.replace('_', ' ')}, ${PLAN_LABEL[b.plan_type].toLowerCase()} plan`}
                    </div>
                  </div>
                  <StatusBadge value={b.phase} kind="booking" />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="text-ink-soft">
                    {fdate(b.start_date)}
                    {b.end_date !== b.start_date && ` to ${fdate(b.end_date)}`} ·{' '}
                    {ftime(b.start_time)} to {ftime(b.end_time)}
                  </div>
                  <div className="font-display text-lg font-bold">{money(b.total_price)}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isHelper && b.phase === 'awaiting_response' && (
                    <RespondButtons booking={b} onDone={reload} />
                  )}
                  <Link
                    to={`/bookings/${b.id}`}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-wash"
                  >
                    View details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </div>
  );
}
