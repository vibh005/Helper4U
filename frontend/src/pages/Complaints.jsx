import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { COMPLAINT_CATEGORIES, fdate } from '../lib/format';
import { Empty, LoadState, PageHeader, Pagination, StatusBadge, useFetch } from '../components/ui';

export default function Complaints() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(
    () => api.get(`/complaints?page=${page}&limit=10`).then((r) => r.data),
    [page],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Your complaints"
        sub="To report a problem, open the booking it relates to and choose Report a problem."
      />
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.complaints.length === 0 ? (
          <Empty title="No complaints filed">
            If something goes wrong with a booking, you can report it from that booking's page and
            our team will look into it.
          </Empty>
        ) : (
          <ul className="space-y-4">
            {data?.complaints.map((c) => (
              <li key={c.id} className="rounded-xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-display text-lg font-semibold">
                    {COMPLAINT_CATEGORIES[c.category]}{' '}
                    <span className="font-sans text-sm font-normal text-ink-soft">
                      about {c.against_name}
                    </span>
                  </div>
                  <StatusBadge value={c.status} />
                </div>
                <p className="mt-2 text-sm">{c.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 text-xs text-ink-soft">
                  <span>Filed {fdate(c.created_at)}</span>
                  {c.booking_id && (
                    <Link
                      to={`/bookings/${c.booking_id}`}
                      className="font-semibold text-ink underline"
                    >
                      Booking #{c.booking_id}
                    </Link>
                  )}
                </div>
                {c.resolution_note && (
                  <div className="mt-3 rounded-lg bg-wash p-3 text-sm">
                    <span className="font-semibold">Response from our team: </span>
                    {c.resolution_note}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </div>
  );
}
