import { useEffect, useState } from 'react';
import { api, errMsg } from '../../api';
import { DAYS, DOC_TYPES, PLAN_LABEL, fdate, hhmm } from '../../lib/format';
import {
  Alert,
  Button,
  Checks,
  Field,
  Input,
  LoadState,
  PageHeader,
  Panel,
  Select,
  Seal,
  StatusBadge,
  Textarea,
  useFetch,
  useToast,
} from '../../components/ui';

const EMPTY = {
  service_type: '',
  bio: '',
  experience_years: 0,
  skills: '',
  languages: '',
  available_days: [],
  available_from: '',
  available_to: '',
  availability_status: 'available',
  preferred_plans: [],
  hourly_rate: '',
  monthly_rate: '',
  yearly_rate: '',
};
const list = (s) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export default function HelperProfile() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(
    () => api.get('/helpers/me/profile').then((r) => r.data),
    [],
  );
  const cats = useFetch(() => api.get('/categories').then((r) => r.data.categories), []);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [doc, setDoc] = useState({ doc_type: 'identity', file: null });
  const p = data?.profile;

  useEffect(() => {
    if (p)
      setF({
        service_type: p.service_type,
        bio: p.bio || '',
        experience_years: p.experience_years,
        skills: p.skills.join(', '),
        languages: p.languages.join(', '),
        available_days: p.available_days,
        available_from: hhmm(p.available_from),
        available_to: hhmm(p.available_to),
        availability_status: p.availability_status,
        preferred_plans: p.preferred_plans,
        hourly_rate: p.hourly_rate ?? '',
        monthly_rate: p.monthly_rate ?? '',
        yearly_rate: p.yearly_rate ?? '',
      });
  }, [p]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rate = (v) => (v === '' ? null : Number(v));

  const save = async (e) => {
    e.preventDefault();
    setBusy('save');
    setErr('');
    try {
      await api.put('/helpers/me/profile', {
        service_type: f.service_type,
        bio: f.bio,
        experience_years: Number(f.experience_years) || 0,
        skills: list(f.skills),
        languages: list(f.languages),
        available_days: f.available_days,
        available_from: f.available_from || null,
        available_to: f.available_to || null,
        availability_status: f.availability_status,
        preferred_plans: f.preferred_plans,
        hourly_rate: rate(f.hourly_rate),
        monthly_rate: rate(f.monthly_rate),
        yearly_rate: rate(f.yearly_rate),
      });
      toast('Profile saved');
      reload();
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy('');
    }
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!doc.file) return;
    setBusy('upload');
    const fd = new FormData();
    fd.append('doc_type', doc.doc_type);
    fd.append('document', doc.file);
    try {
      await api.post('/helpers/me/documents', fd);
      toast('Document uploaded');
      setDoc({ ...doc, file: null });
      e.target.reset();
      reload();
    } catch (x) {
      toast(errMsg(x), 'bad');
    } finally {
      setBusy('');
    }
  };

  const view = async (d) => {
    try {
      const r = await api.get(`/helpers/documents/${d.id}/file`, { responseType: 'blob' });
      window.open(URL.createObjectURL(r.data), '_blank', 'noopener');
    } catch (x) {
      toast(errMsg(x), 'bad');
    }
  };
  const remove = async (d) => {
    try {
      await api.delete(`/helpers/me/documents/${d.id}`);
      toast('Document removed');
      reload();
    } catch (x) {
      toast(errMsg(x), 'bad');
    }
  };
  const submit = async () => {
    setBusy('submit');
    try {
      await api.post('/helpers/me/submit-verification');
      toast('Submitted for review');
      reload();
    } catch (x) {
      toast(errMsg(x), 'bad');
    } finally {
      setBusy('');
    }
  };

  const hasIdentity = data?.documents.some((d) => d.doc_type === 'identity');
  const canEditDocs =
    p && p.verification_status !== 'pending' && p.verification_status !== 'verified';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My profile" sub="Households see this once our team has verified you." />
      <LoadState loading={loading} error={error} onRetry={reload}>
        <form onSubmit={save} className="space-y-6">
          {err && <Alert>{err}</Alert>}
          <Panel title="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service you offer">
                <Select required value={f.service_type} onChange={set('service_type')}>
                  <option value="">Choose a service</option>
                  {cats.data?.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Years of experience">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={f.experience_years}
                  onChange={set('experience_years')}
                />
              </Field>
              <Field
                label="Short introduction"
                className="sm:col-span-2"
                hint="Tell households about your work and what you are good at."
              >
                <Textarea maxLength={1000} value={f.bio} onChange={set('bio')} />
              </Field>
              <Field label="Skills" hint="Separate with commas, for example: cooking, first aid">
                <Input value={f.skills} onChange={set('skills')} />
              </Field>
              <Field label="Languages" hint="For example: Hindi, English">
                <Input value={f.languages} onChange={set('languages')} />
              </Field>
            </div>
          </Panel>

          <Panel title="Availability">
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-semibold">Days you work</div>
                <Checks
                  options={DAYS}
                  value={f.available_days}
                  onChange={(v) => setF({ ...f, available_days: v })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="From">
                  <Input type="time" value={f.available_from} onChange={set('available_from')} />
                </Field>
                <Field label="Until">
                  <Input type="time" value={f.available_to} onChange={set('available_to')} />
                </Field>
                <Field label="Current status">
                  <Select value={f.availability_status} onChange={set('availability_status')}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="unavailable">Not taking bookings</option>
                  </Select>
                </Field>
              </div>
            </div>
          </Panel>

          <Panel
            title="Plans and prices"
            sub="Tick the plans you offer and set your rate for each."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {Object.entries(PLAN_LABEL).map(([k, label]) => (
                <div key={k} className="rounded-lg border border-line p-3">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#1e2a5a]"
                      checked={f.preferred_plans.includes(k)}
                      onChange={(e) =>
                        setF({
                          ...f,
                          preferred_plans: e.target.checked
                            ? [...f.preferred_plans, k]
                            : f.preferred_plans.filter((x) => x !== k),
                        })
                      }
                    />
                    {label}
                  </label>
                  <Field
                    label={`Rate per ${k === 'hourly' ? 'hour' : k === 'monthly' ? 'month' : 'year'} (Rs)`}
                    className="mt-2"
                  >
                    <Input
                      type="number"
                      min={0}
                      value={f[`${k}_rate`]}
                      onChange={set(`${k}_rate`)}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Panel>
          <Button type="submit" loading={busy === 'save'}>
            {p ? 'Save profile' : 'Create profile'}
          </Button>
        </form>

        {p && (
          <Panel title="Verification" actions={<StatusBadge value={p.verification_status} />}>
            <div className="space-y-4">
              {p.verification_status === 'verified' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-leaf">
                  <Seal size={22} /> Verified on {fdate(p.verified_at)}. Households can now find and
                  book you.
                </div>
              )}
              {p.verification_status === 'pending' && (
                <Alert tone="info">
                  Our team is reviewing your documents. You cannot change documents while they are
                  under review.
                </Alert>
              )}
              {p.verification_status === 'rejected' && (
                <Alert>
                  Changes needed:{' '}
                  {p.verification_note || 'Please check your documents and resubmit.'}
                </Alert>
              )}
              {p.verification_status === 'unverified' && (
                <p className="text-sm text-ink-soft">
                  Upload at least one identity document (for example Aadhaar or a voter ID), then
                  submit for review. Police verification and address proof help too.
                </p>
              )}

              {data.documents.length > 0 && (
                <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                  {data.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <span>
                        <span className="font-semibold">{DOC_TYPES[d.doc_type]}</span>{' '}
                        <span className="text-ink-soft">{d.original_name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge value={d.status} />
                        <Button size="sm" variant="secondary" onClick={() => view(d)}>
                          View
                        </Button>
                        {canEditDocs && d.status !== 'approved' && (
                          <Button size="sm" variant="ghost" onClick={() => remove(d)}>
                            Remove
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {canEditDocs && (
                <form
                  onSubmit={upload}
                  className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
                >
                  <Field label="Document type">
                    <Select
                      value={doc.doc_type}
                      onChange={(e) => setDoc({ ...doc, doc_type: e.target.value })}
                    >
                      {Object.entries(DOC_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="File" hint="PDF, JPG or PNG, up to 4 MB">
                    <input
                      type="file"
                      required
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) => setDoc({ ...doc, file: e.target.files[0] })}
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-wash file:px-3 file:py-1 file:text-sm file:font-semibold"
                    />
                  </Field>
                  <Button type="submit" variant="secondary" loading={busy === 'upload'}>
                    Upload
                  </Button>
                </form>
              )}

              {canEditDocs && (
                <div className="border-t border-line pt-4">
                  <Button
                    variant="accent"
                    disabled={!hasIdentity}
                    loading={busy === 'submit'}
                    onClick={submit}
                  >
                    Submit for verification
                  </Button>
                  {!hasIdentity && (
                    <p className="mt-2 text-xs text-ink-soft">
                      Upload an identity document to enable this.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Panel>
        )}
      </LoadState>
    </div>
  );
}
