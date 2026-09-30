import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg, qs } from '../../api';
import { COMPLAINT_CATEGORIES, fdate } from '../../lib/format';
import {
  Button,
  Empty,
  Field,
  LoadState,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
  useFetch,
  useToast,
} from '../../components/ui';

function Case({ c, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(c.status);
  const [note, setNote] = useState(c.resolution_note || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/complaints/${c.id}`, { status, resolution_note: note || undefined });
      toast('Complaint updated');
      onChanged();
    } catch (e) {
      toast(errMsg(e), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="px-5 py-4">
      <button
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <span className="font-semibold">{COMPLAINT_CATEGORIES[c.category]}</span>
          <span className="text-sm text-ink-soft">
            {' '}
            · {c.complainant_name} ({c.complainant_role}) against {c.against_name} ({c.against_role}
            ) · {fdate(c.created_at)}
          </span>
        </span>
        <StatusBadge value={c.status} />
      </button>
      {open && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <p className="text-sm">{c.description}</p>
          {c.booking_id && (
            <Link to={`/bookings/${c.booking_id}`} className="text-sm font-semibold underline">
              Open booking #{c.booking_id}
            </Link>
          )}
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="in_review">In review</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </Select>
            </Field>
            <Field
              label="Resolution note"
              hint="Required to resolve or dismiss. The person who filed it will see this."
            >
              <Textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <Button
            loading={busy}
            onClick={save}
            disabled={['resolved', 'dismissed'].includes(status) && !note.trim()}
          >
            Save
          </Button>
        </div>
      )}
    </li>
  );
}

export default function AdminComplaints() {
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(
    () =>
      api.get(`/admin/complaints${qs({ status, category, page, limit: 10 })}`).then((r) => r.data),
    [status, category, page],
  );
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Complaints"
        sub="Review reports from households and helpers and record the outcome."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[12rem_14rem]">
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </Select>
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.complaints.length === 0 ? (
          <Empty title="No complaints here" />
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {data?.complaints.map((c) => (
              <Case key={`${c.id}-${c.status}`} c={c} onChanged={reload} />
            ))}
          </ul>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </div>
  );
}
