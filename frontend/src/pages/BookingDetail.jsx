import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../auth/AuthContext';
import { COMPLAINT_CATEGORIES, PLAN_LABEL, PLAN_UNIT, fdate, ftime, money, todayStr } from '../lib/format';
import { Alert, Button, DL, Field, LoadState, Modal, PageHeader, Panel, Select, StarInput, Stars, StatusBadge, Textarea, useFetch, useToast } from '../components/ui';

/* ---------- accept / decline (used here and in the jobs list) ---------- */
export function RespondButtons({ booking, onDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');

  const respond = async (decision) => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/respond`, { decision, reason: reason || undefined });
      toast(decision === 'accept' ? 'Booking accepted' : 'Booking declined');
      setDeclining(false); onDone();
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(false); }
  };

  return (
    <>
      <Button size="sm" loading={busy} onClick={() => respond('accept')}>Accept</Button>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDeclining(true)}>Decline</Button>
      <Modal open={declining} title="Decline this request" onClose={() => setDeclining(false)}>
        <Field label="Reason (optional)" hint="The household will see this."><Textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeclining(false)}>Keep request</Button>
          <Button variant="danger" loading={busy} onClick={() => respond('reject')}>Decline request</Button>
        </div>
      </Modal>
    </>
  );
}

/* ---------- attendance ---------- */
function Attendance({ booking, canMark }) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get(`/bookings/${booking.id}/attendance`).then((r) => r.data), [booking.id]);
  const maxDate = todayStr() < booking.end_date ? todayStr() : booking.end_date;
  const [f, setF] = useState({ date: maxDate >= booking.start_date ? maxDate : booking.start_date, status: 'present', note: '' });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post(`/bookings/${booking.id}/attendance`, { ...f, note: f.note || undefined }); toast('Attendance saved'); reload(); }
    catch (x) { toast(errMsg(x), 'bad'); } finally { setBusy(false); }
  };

  return (
    <Panel title="Attendance" sub={data ? `${data.summary.present} present, ${data.summary.absent} absent` : undefined}>
      {canMark && booking.start_date <= todayStr() && (
        <form onSubmit={save} className="mb-5 grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
          <Field label="Date"><input type="date" required min={booking.start_date} max={maxDate} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" /></Field>
          <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="present">Present</option><option value="absent">Absent</option></Select></Field>
          <Field label="Note"><input maxLength={255} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" placeholder="Optional" /></Field>
          <Button type="submit" loading={busy}>Save</Button>
        </form>
      )}
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data?.attendance.length === 0 ? <p className="text-sm text-ink-soft">No attendance has been marked yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {data?.attendance.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span>{fdate(a.work_date)}{a.note && <span className="text-ink-soft"> - {a.note}</span>}</span>
                <StatusBadge value={a.status} />
              </li>
            ))}
          </ul>
        )}
      </LoadState>
    </Panel>
  );
}

/* ---------- review ---------- */
function ReviewForm({ booking, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast('Choose a star rating first', 'bad');
    setBusy(true);
    try { await api.post(`/bookings/${booking.id}/review`, { rating, comment: comment || undefined }); toast('Thank you for your review'); onDone(); }
    catch (x) { toast(errMsg(x), 'bad'); setBusy(false); }
  };
  return (
    <Panel title={`How was your experience with ${booking.helper_name}?`}>
      <form onSubmit={submit} className="space-y-3">
        <StarInput value={rating} onChange={setRating} />
        <Field label="Comment (optional)"><Textarea value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder="What went well? Anything others should know?" /></Field>
        <Button type="submit" loading={busy}>Submit review</Button>
      </form>
    </Panel>
  );
}

/* ---------- page ---------- */
export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: b, loading, error, reload } = useFetch(() => api.get(`/bookings/${id}`).then((r) => r.data.booking), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ category: 'no_show', description: '' });
  const [busy, setBusy] = useState('');

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); toast(okMsg); setCancelOpen(false); setReportOpen(false); reload(); }
    catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(''); }
  };

  const role = user.role;
  const isHelper = role === 'helper';
  const isHousehold = role === 'household';
  const other = isHelper ? b?.household_name : b?.helper_name;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={role === 'admin' ? '/admin/bookings' : '/bookings'} className="mb-4 inline-block text-sm font-semibold underline">Back to bookings</Link>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {b && (
          <div className="space-y-6">
            <PageHeader
              title={`${PLAN_LABEL[b.plan_type]} booking with ${role === 'admin' ? `${b.helper_name} and ${b.household_name}` : other}`}
              sub={`Request #${b.id} for ${b.service_type.replace('_', ' ')}`}
              actions={<StatusBadge value={b.phase} kind="booking" />}
            />

            {b.status === 'rejected' && <Alert tone="warn">This request was declined.{b.rejection_reason && ` Reason: ${b.rejection_reason}`}</Alert>}
            {b.status === 'cancelled' && <Alert tone="warn">Cancelled by the {b.cancelled_by}.{b.cancel_reason && ` Reason: ${b.cancel_reason}`}</Alert>}
            {b.phase === 'expired' && <Alert tone="warn">The start date has passed without a response, so this request can no longer be accepted.</Alert>}

            <Panel title="Booking details">
              <DL items={[
                ['Dates', `${fdate(b.start_date)}${b.end_date !== b.start_date ? ` to ${fdate(b.end_date)}` : ''}`],
                ['Daily time', `${ftime(b.start_time)} to ${ftime(b.end_time)}`],
                ['Days', b.plan_type === 'hourly' ? null : b.schedule_days.join(', ')],
                ['Duration', `${b.quantity} ${PLAN_UNIT[b.plan_type]}${Number(b.quantity) === 1 ? '' : 's'}`],
                ['Rate', `${money(b.rate)} per ${PLAN_UNIT[b.plan_type]}`],
                ['Total price', <span key="t" className="font-display text-xl font-bold">{money(b.total_price)}</span>],
                ['Service address', b.address || 'Shared once the helper accepts'],
                [isHelper ? 'Household' : 'Helper', other],
                ['Contact phone', isHelper ? b.household_phone : b.helper_phone],
                ['Notes', b.notes],
              ]} />
              {!isHelper && role !== 'admin' && b.helper_phone === undefined && <p className="mt-3 text-xs text-ink-soft">The helper&apos;s phone number is shown once they accept your request.</p>}
            </Panel>

            {/* actions */}
            <div className="flex flex-wrap gap-3">
              {isHelper && b.phase === 'awaiting_response' && <RespondButtons booking={b} onDone={reload} />}
              {['household', 'helper'].includes(role) && b.status === 'accepted' && todayStr() >= b.end_date && (
                <Button variant="accent" loading={busy === 'done'} onClick={() => act('done', () => api.post(`/bookings/${b.id}/complete`), 'Marked as completed')}>Mark as completed</Button>
              )}
              {['pending', 'accepted'].includes(b.status) && (
                <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
              )}
              {['household', 'helper'].includes(role) && ['accepted', 'completed', 'cancelled'].includes(b.status) && (
                <Button variant="ghost" onClick={() => setReportOpen(true)}>Report a problem</Button>
              )}
            </div>
            {['household', 'helper'].includes(role) && b.status === 'accepted' && todayStr() < b.end_date && (
              <p className="-mt-3 text-xs text-ink-soft">You can mark this booking as completed on {fdate(b.end_date)}.</p>
            )}

            {['accepted', 'completed'].includes(b.status) && <Attendance booking={b} canMark={isHelper && b.status === 'accepted'} />}

            {isHousehold && b.status === 'completed' && (b.review_id
              ? <Panel title="Your review"><Stars value={b.review_rating} /></Panel>
              : <ReviewForm booking={b} onDone={reload} />)}

            <Modal open={cancelOpen} title="Cancel this booking" onClose={() => setCancelOpen(false)}>
              <Field label={b.status === 'accepted' ? 'Reason (required)' : 'Reason (optional)'}><Textarea value={cancelReason} maxLength={500} onChange={(e) => setCancelReason(e.target.value)} /></Field>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep booking</Button>
                <Button variant="danger" loading={busy === 'cancel'} disabled={b.status === 'accepted' && !cancelReason.trim()}
                  onClick={() => act('cancel', () => api.patch(`/bookings/${b.id}/cancel`, { reason: cancelReason || undefined }), 'Booking cancelled')}>Cancel booking</Button>
              </div>
            </Modal>

            <Modal open={reportOpen} title="Report a problem" onClose={() => setReportOpen(false)}>
              <div className="space-y-3">
                <Field label="What happened?"><Select value={report.category} onChange={(e) => setReport({ ...report, category: e.target.value })}>{Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label="Details" hint="At least 10 characters. Our team will review this."><Textarea rows={4} value={report.description} maxLength={2000} onChange={(e) => setReport({ ...report, description: e.target.value })} /></Field>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setReportOpen(false)}>Close</Button>
                <Button loading={busy === 'report'} disabled={report.description.trim().length < 10}
                  onClick={() => act('report', () => api.post('/complaints', { booking_id: b.id, ...report }), 'Complaint sent to our team')}>Send report</Button>
              </div>
            </Modal>
          </div>
        )}
      </LoadState>
    </div>
  );
}
