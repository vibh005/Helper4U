import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errMsg } from '../../api';
import { DOC_TYPES, PLAN_LABEL, fdate, ftime, rateText } from '../../lib/format';
import { Alert, Button, DL, Field, LoadState, PageHeader, Panel, StatusBadge, Textarea, useFetch, useToast } from '../../components/ui';

export default function AdminHelperDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data: h, loading, error, reload } = useFetch(() => api.get(`/admin/helpers/${id}`).then((r) => r.data.helper), [id]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  const run = async (key, fn, msg) => {
    setBusy(key);
    try { await fn(); toast(msg); reload(); } catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(''); }
  };
  const view = async (d) => {
    try { const r = await api.get(`/helpers/documents/${d.id}/file`, { responseType: 'blob' }); window.open(URL.createObjectURL(r.data), '_blank', 'noopener'); }
    catch (e) { toast(errMsg(e), 'bad'); }
  };
  const review = (d, status) => run(`doc${d.id}${status}`, () => api.patch(`/admin/documents/${d.id}`, { status }), `Document ${status}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/admin/helpers" className="text-sm font-semibold underline">Back to helpers</Link>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {h && (
          <>
            <PageHeader title={h.name} sub={`${h.email}${h.phone ? ` · ${h.phone}` : ''}`} actions={<StatusBadge value={h.verification_status} />} />
            {!h.is_active && <Alert tone="warn">This account is deactivated.</Alert>}
            {h.verification_note && <Alert tone="info">Last decision note: {h.verification_note}</Alert>}

            <Panel title="Profile">
              <DL items={[
                ['Service', h.service_type.replace('_', ' ')], ['City', h.city], ['Experience', `${h.experience_years} years`],
                ['Skills', h.skills.join(', ')], ['Languages', h.languages.join(', ')], ['Works on', h.available_days.join(', ')],
                ['Hours', h.available_from ? `${ftime(h.available_from)} to ${ftime(h.available_to)}` : null],
                ['Plans', ['hourly', 'monthly', 'yearly'].filter((p) => h.preferred_plans.includes(p) && h[`${p}_rate`] != null).map((p) => `${PLAN_LABEL[p]} ${rateText(p, h[`${p}_rate`])}`).join(', ')],
                ['Rating', `${h.avg_rating} (${h.review_count} reviews)`],
                ['Reliability', h.reliability ? `${h.reliability.score} / 100 (${h.reliability.days_present} days present, ${h.reliability.days_absent} absent, ${h.reliability.helper_cancellations} cancelled)` : null],
                ['Introduction', h.bio],
              ]} />
            </Panel>

            <Panel title="Documents" sub="Approve the documents you have checked. An approved identity document is required to verify.">
              {h.documents.length === 0 ? <p className="text-sm text-ink-soft">No documents uploaded.</p> : (
                <ul className="divide-y divide-line">
                  {h.documents.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span><span className="font-semibold">{DOC_TYPES[d.doc_type]}</span> <span className="text-ink-soft">{d.original_name} · {fdate(d.uploaded_at)}</span></span>
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={d.status} />
                        <Button size="sm" variant="secondary" onClick={() => view(d)}>Open</Button>
                        {d.status !== 'approved' && <Button size="sm" loading={busy === `doc${d.id}approved`} onClick={() => review(d, 'approved')}>Approve</Button>}
                        {d.status !== 'rejected' && <Button size="sm" variant="danger" loading={busy === `doc${d.id}rejected`} onClick={() => review(d, 'rejected')}>Reject</Button>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {h.verification_status === 'pending' && (
              <Panel title="Decision">
                <Field label="Note to the helper" hint="Required when rejecting. The helper will see this and can resubmit."><Textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></Field>
                <div className="mt-4 flex gap-3">
                  <Button loading={busy === 'approve'} onClick={() => run('approve', () => api.patch(`/admin/helpers/${h.id}/verification`, { decision: 'approve', note: note || undefined }), 'Helper verified')}>Verify helper</Button>
                  <Button variant="danger" disabled={!note.trim()} loading={busy === 'reject'} onClick={() => run('reject', () => api.patch(`/admin/helpers/${h.id}/verification`, { decision: 'reject', note }), 'Helper rejected')}>Reject</Button>
                </div>
              </Panel>
            )}
          </>
        )}
      </LoadState>
    </div>
  );
}
