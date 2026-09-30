import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../../api';
import { fdate } from '../../lib/format';
import {
  Empty,
  Field,
  Input,
  LoadState,
  Monogram,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  useFetch,
} from '../../components/ui';

export default function AdminHelpers() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || 'pending');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(
    () =>
      api.get(`/admin/helpers${qs({ status, search: q, page, limit: 15 })}`).then((r) => r.data),
    [status, q, page],
  );

  return (
    <div>
      <PageHeader title="Helpers" sub="Review documents and decide who gets verified." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search);
          setPage(1);
        }}
        className="mb-5 grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end"
      >
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="pending">Waiting for review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="unverified">Not submitted</option>
          </Select>
        </Field>
        <Field label="Search by name or email">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.helpers.length === 0 ? (
          <Empty title="No helpers found">
            {status === 'pending'
              ? 'Nobody is waiting for verification right now.'
              : 'Try a different filter.'}
          </Empty>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {data?.helpers.map((h) => (
              <li key={h.id}>
                <Link
                  to={`/admin/helpers/${h.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-wash"
                >
                  <Monogram name={h.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{h.name}</span>
                    <span className="block truncate text-sm text-ink-soft">
                      {h.email} ·{' '}
                      <span className="capitalize">{h.service_type.replace('_', ' ')}</span>
                      {h.city && ` · ${h.city}`}
                    </span>
                  </span>
                  <span className="hidden text-xs text-ink-soft sm:block">
                    Updated {fdate(h.updated_at)}
                  </span>
                  <StatusBadge value={h.verification_status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </div>
  );
}
