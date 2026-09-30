import { useState } from 'react';
import { api, errMsg } from '../../api';
import { Alert, Badge, Button, Field, Input, LoadState, PageHeader, Panel, useFetch, useToast } from '../../components/ui';

function Row({ c, onChanged }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: c.name, description: c.description || '' });
  const save = async (body, msg) => {
    try { await api.put(`/admin/categories/${c.id}`, body); toast(msg); setEdit(false); onChanged(); } catch (e) { toast(errMsg(e), 'bad'); }
  };
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      {edit ? (
        <form className="grid flex-1 gap-3 sm:grid-cols-[1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); save(f, 'Category updated'); }}>
          <Input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Name" />
          <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Description" />
          <div className="flex gap-2"><Button type="submit" size="sm">Save</Button><Button size="sm" variant="secondary" onClick={() => setEdit(false)}>Cancel</Button></div>
        </form>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2 font-semibold">{c.name} <Badge tone={c.is_active ? 'good' : 'neutral'}>{c.is_active ? 'Active' : 'Hidden'}</Badge></div>
            <div className="text-sm text-ink-soft">{c.description || 'No description'} · <code className="text-xs">{c.slug}</code></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>Edit</Button>
            <Button size="sm" variant="secondary" onClick={() => save({ is_active: !c.is_active }, c.is_active ? 'Category hidden' : 'Category shown')}>{c.is_active ? 'Hide' : 'Show'}</Button>
          </div>
        </>
      )}
    </li>
  );
}

export default function AdminCategories() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/categories').then((r) => r.data.categories), []);
  const [f, setF] = useState({ name: '', description: '' });
  const [err, setErr] = useState('');

  const add = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.post('/admin/categories', f); toast('Category added'); setF({ name: '', description: '' }); reload(); } catch (x) { setErr(errMsg(x)); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Service categories" sub="Helpers choose one of these when they create their profile. Hiding a category keeps existing helpers but stops new ones from picking it." />
      <Panel title="Add a category">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Field label="Name"><Input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="For example: Cook" /></Field>
          <Field label="Description"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Button type="submit">Add category</Button>
        </form>
        {err && <Alert className="mt-3">{err}</Alert>}
      </Panel>
      <LoadState loading={loading} error={error} onRetry={reload}>
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">{data?.map((c) => <Row key={c.id} c={c} onChanged={reload} />)}</ul>
      </LoadState>
    </div>
  );
}
