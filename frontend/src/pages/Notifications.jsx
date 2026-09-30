import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { fullDateTime } from '../lib/format';
import { Button, Empty, LoadState, PageHeader, Pagination, cx, useFetch } from '../components/ui';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => api.get(`/notifications?page=${page}&limit=20`).then((r) => r.data), [page]);

  const open = async (n) => {
    if (!n.is_read) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    if (n.link) navigate(n.link); else reload();
  };
  const readAll = async () => { await api.post('/notifications/read-all'); reload(); };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" actions={data?.unread_count > 0 && <Button variant="secondary" size="sm" onClick={readAll}>Mark all as read</Button>} />
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.notifications.length === 0 ? (
          <Empty title="You are all caught up">Updates about your bookings, reviews and verification will show up here.</Empty>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {data?.notifications.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={cx('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-wash', !n.is_read && 'bg-marigold/10')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-marigold')} aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block font-semibold">{n.title}</span>
                    {n.message && <span className="block text-sm text-ink-soft">{n.message}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">{fullDateTime(n.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </div>
  );
}
