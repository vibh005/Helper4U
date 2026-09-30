import { useState } from 'react';
import { api, errMsg, qs } from '../../api';
import { fdate } from '../../lib/format';
import {
  Badge,
  Button,
  Empty,
  Field,
  Input,
  LoadState,
  PageHeader,
  Pagination,
  Select,
  useFetch,
  useToast,
} from '../../components/ui';

export default function AdminUsers() {
  const toast = useToast();
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(
    () =>
      api
        .get(`/admin/users${qs({ role, active, search: q, page, limit: 15 })}`)
        .then((r) => r.data),
    [role, active, q, page],
  );

  const toggle = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/status`, { is_active: !u.is_active });
      toast(u.is_active ? 'User deactivated' : 'User reactivated');
      reload();
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        sub="Deactivated users are signed out and cannot log in or be booked."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search);
          setPage(1);
        }}
        className="mb-5 grid gap-3 sm:grid-cols-[10rem_10rem_1fr_auto] sm:items-end"
      >
        <Field label="Role">
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="household">Households</option>
            <option value="helper">Helpers</option>
            <option value="admin">Admins</option>
          </Select>
        </Field>
        <Field label="Account">
          <Select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
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
        {data?.users.length === 0 ? (
          <Empty title="No users found" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-xs text-ink-soft">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">{u.city || '-'}</td>
                    <td className="px-4 py-3">{fdate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.is_active ? 'good' : 'neutral'}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant={u.is_active ? 'secondary' : 'primary'}
                          onClick={() => toggle(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={data?.pages} onChange={setPage} />
      </LoadState>
    </div>
  );
}
