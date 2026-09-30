import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, errMsg } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { DAYS, PLAN_LABEL, PLAN_UNIT, fdate, ftime, hhmm, money, rateText, todayStr } from '../../lib/format';
import { Alert, Button, Checks, DL, Field, Input, LoadState, Monogram, Panel, Select, Seal, Stars, StatusBadge, Textarea, useFetch } from '../../components/ui';

function BookingForm({ helper, defaultAddress }) {
  const navigate = useNavigate();
  const plans = ['hourly', 'monthly', 'yearly'].filter((p) => helper.preferred_plans.includes(p) && helper[`${p}_rate`] != null);
  const workDays = helper.available_days.length ? helper.available_days : DAYS;
  const openAt = hhmm(helper.available_from) || '09:00';
  const closeAt = hhmm(helper.available_to) || '23:59';
  const plusHours = (t, n) => { const [h, m] = t.split(':').map(Number); const x = Math.min(h * 60 + m + n * 60, 23 * 60 + 59); return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
  const [f, setF] = useState({
    plan_type: plans[0] || '', start_date: todayStr(), start_time: openAt, end_time: plusHours(openAt, 3) < closeAt ? plusHours(openAt, 3) : closeAt,
    duration_months: 1, duration_years: 1, schedule_days: workDays, address: defaultAddress || '', notes: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (defaultAddress && !f.address) setF((s) => ({ ...s, address: defaultAddress })); }, [defaultAddress]); // eslint-disable-line
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const estimate = useMemo(() => {
    const rate = helper[`${f.plan_type}_rate`];
    if (rate == null) return null;
    const [h1, m1] = f.start_time.split(':').map(Number);
    const [h2, m2] = f.end_time.split(':').map(Number);
    const hours = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
    const qty = f.plan_type === 'hourly' ? hours : f.plan_type === 'monthly' ? Number(f.duration_months) : Number(f.duration_years);
    return qty > 0 ? { qty, total: Math.round(rate * qty * 100) / 100 } : null;
  }, [f, helper]);

  if (!plans.length) return <Alert tone="warn">This helper has not set any prices yet, so they cannot be booked right now.</Alert>;
  if (helper.availability_status === 'unavailable') return <Alert tone="warn">This helper is not taking bookings right now.</Alert>;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const body = { helper_id: helper.id, plan_type: f.plan_type, start_date: f.start_date, start_time: f.start_time, end_time: f.end_time, notes: f.notes || undefined, address: f.address || undefined };
    if (f.plan_type === 'monthly') { body.duration_months = Number(f.duration_months); body.schedule_days = f.schedule_days; }
    if (f.plan_type === 'yearly') { body.duration_years = Number(f.duration_years); body.schedule_days = f.schedule_days; }
    try { const r = await api.post('/bookings', body); navigate(`/bookings/${r.data.booking.id}`); }
    catch (x) { setErr(errMsg(x)); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <Alert>{err}</Alert>}
      <Field label="Service plan">
        <Select value={f.plan_type} onChange={set('plan_type')}>{plans.map((p) => <option key={p} value={p}>{PLAN_LABEL[p]} - {rateText(p, helper[`${p}_rate`])}</option>)}</Select>
      </Field>
      <Field label={f.plan_type === 'hourly' ? 'Date' : 'Start date'}><Input type="date" required min={todayStr()} value={f.start_date} onChange={set('start_date')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={f.plan_type === 'hourly' ? 'From' : 'Daily start'}><Input type="time" required value={f.start_time} onChange={set('start_time')} /></Field>
        <Field label={f.plan_type === 'hourly' ? 'To' : 'Daily end'}><Input type="time" required value={f.end_time} onChange={set('end_time')} /></Field>
      </div>
      {f.plan_type === 'monthly' && <Field label="Number of months"><Input type="number" min={1} max={11} value={f.duration_months} onChange={set('duration_months')} /></Field>}
      {f.plan_type === 'yearly' && <Field label="Number of years"><Input type="number" min={1} max={3} value={f.duration_years} onChange={set('duration_years')} /></Field>}
      {f.plan_type !== 'hourly' && (
        <div>
          <div className="mb-1 text-sm font-semibold">Days of the week</div>
          <Checks options={DAYS} value={f.schedule_days} onChange={(v) => setF({ ...f, schedule_days: v })} disabledOptions={DAYS.filter((d) => !workDays.includes(d))} />
        </div>
      )}
      <Field label="Service address" hint={defaultAddress ? 'Filled in from your household profile' : 'Add an address here or save one in My household'}>
        <Input required maxLength={255} value={f.address} onChange={set('address')} />
      </Field>
      <Field label="Notes for the helper"><Textarea maxLength={1000} value={f.notes} onChange={set('notes')} placeholder="Tasks, children's ages, anything important" /></Field>
      <div className="rounded-lg bg-wash p-4 text-sm">
        {estimate ? (
          <div className="flex items-baseline justify-between">
            <span>{f.plan_type === 'hourly' ? `${estimate.qty} hour${estimate.qty === 1 ? '' : 's'}` : `${estimate.qty} ${PLAN_UNIT[f.plan_type]}${estimate.qty === 1 ? '' : 's'}`} at {rateText(f.plan_type, helper[`${f.plan_type}_rate`])}</span>
            <span className="font-display text-2xl font-bold">{money(estimate.total)}</span>
          </div>
        ) : <span className="text-ink-soft">Choose valid times to see the price.</span>}
      </div>
      <Button type="submit" variant="accent" loading={busy} className="w-full">Send booking request</Button>
      <p className="text-xs text-ink-soft">The helper must accept before the booking is confirmed. You are not charged online; payment is arranged directly with the helper.</p>
    </form>
  );
}

export default function HelperDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [rpage, setRpage] = useState(1);
  const { data: helper, loading, error, reload } = useFetch(() => api.get(`/browse/helpers/${id}`).then((r) => r.data.helper), [id]);
  const reviews = useFetch(() => api.get(`/browse/helpers/${id}/reviews?page=${rpage}&limit=5`).then((r) => r.data), [id, rpage]);
  const home = useFetch(() => (user.role === 'household' ? api.get('/households/me/profile').then((r) => r.data.profile) : Promise.resolve(null)), []);

  return (
    <div>
      <Link to="/browse" className="mb-4 inline-block text-sm font-semibold text-ink underline">Back to all helpers</Link>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {helper && (
          <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Monogram name={helper.name} size={72} />
                <div>
                  <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold">{helper.name} <Seal size={28} /></h1>
                  <p className="text-ink-soft"><span className="capitalize">{helper.service_type.replace('_', ' ')}</span>{helper.city && ` in ${helper.city}`}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3"><Stars value={helper.avg_rating} count={helper.review_count} /><StatusBadge value={helper.availability_status} /></div>
                </div>
              </div>

              {helper.bio && <p className="max-w-2xl">{helper.bio}</p>}

              <Panel title="Details">
                <DL items={[
                  ['Experience', `${helper.experience_years} ${helper.experience_years === 1 ? 'year' : 'years'}`],
                  ['Verified on', fdate(helper.verified_at)],
                  ['Skills', helper.skills.join(', ')],
                  ['Languages', helper.languages.join(', ')],
                  ['Works on', helper.available_days.join(', ') || 'Flexible'],
                  ['Hours', helper.available_from ? `${ftime(helper.available_from)} to ${ftime(helper.available_to)}` : 'Flexible'],
                  ['Plans and prices', ['hourly', 'monthly', 'yearly'].filter((p) => helper.preferred_plans.includes(p) && helper[`${p}_rate`] != null).map((p) => `${PLAN_LABEL[p]}: ${rateText(p, helper[`${p}_rate`])}`).join('  |  ')],
                  ['Reliability score', helper.reliability ? `${helper.reliability.score} out of 100` : null],
                ]} />
              </Panel>

              <Panel title={`Reviews (${helper.review_count})`}>
                <LoadState loading={reviews.loading} error={reviews.error} onRetry={reviews.reload}>
                  {reviews.data?.reviews.length === 0 ? <p className="text-sm text-ink-soft">No reviews yet. Reviews appear after households complete a booking.</p> : (
                    <ul className="divide-y divide-line">
                      {reviews.data?.reviews.map((r) => (
                        <li key={r.id} className="py-3">
                          <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-ink-soft">{r.reviewer_name}, {fdate(r.created_at)}</span></div>
                          {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {reviews.data?.pages > 1 && (
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <Button variant="secondary" size="sm" disabled={rpage <= 1} onClick={() => setRpage(rpage - 1)}>Newer</Button>
                      <span className="text-ink-soft">Page {rpage} of {reviews.data.pages}</span>
                      <Button variant="secondary" size="sm" disabled={rpage >= reviews.data.pages} onClick={() => setRpage(rpage + 1)}>Older</Button>
                    </div>
                  )}
                </LoadState>
              </Panel>
            </div>

            <aside>
              <Panel title="Book this helper" className="lg:sticky lg:top-24">
                {user.role === 'household' ? <BookingForm helper={helper} defaultAddress={home.data?.address} /> : <p className="text-sm text-ink-soft">Only household accounts can send booking requests.</p>}
              </Panel>
            </aside>
          </div>
        )}
      </LoadState>
    </div>
  );
}
