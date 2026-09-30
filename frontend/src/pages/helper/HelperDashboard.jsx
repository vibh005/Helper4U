import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { PLAN_LABEL, fdate, money } from '../../lib/format';
import {
  Alert,
  LoadState,
  PageHeader,
  Panel,
  Seal,
  Stars,
  Stat,
  StatusBadge,
  useFetch,
} from '../../components/ui';
import { RespondButtons } from '../BookingDetail';

export default function HelperDashboard() {
  const { user } = useAuth();
  const prof = useFetch(() => api.get('/helpers/me/profile').then((r) => r.data), []);
  const has = !!prof.data?.profile;
  const stats = useFetch(
    () => (has ? api.get('/helpers/me/stats').then((r) => r.data.stats) : Promise.resolve(null)),
    [has],
  );
  const earn = useFetch(
    () =>
      has ? api.get('/helpers/me/earnings').then((r) => r.data.earnings) : Promise.resolve(null),
    [has],
  );
  const pending = useFetch(
    () => api.get('/bookings?status=pending&limit=5').then((r) => r.data),
    [],
  );
  const status = prof.data?.profile?.verification_status;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        sub="Your requests, earnings and standing on Helper4U."
      />
      <LoadState loading={prof.loading} error={prof.error} onRetry={prof.reload}>
        {!has && (
          <Alert tone="warn">
            You have not created your profile yet.{' '}
            <Link to="/helper/profile" className="font-semibold underline">
              Create your profile
            </Link>{' '}
            so our team can verify you and households can find you.
          </Alert>
        )}
        {has && status === 'unverified' && (
          <Alert tone="warn">
            You are not visible to households yet.{' '}
            <Link to="/helper/profile" className="font-semibold underline">
              Upload your documents and submit for verification.
            </Link>
          </Alert>
        )}
        {status === 'pending' && (
          <Alert tone="info">
            Your documents are being reviewed. We will notify you as soon as there is a decision.
          </Alert>
        )}
        {status === 'rejected' && (
          <Alert>
            Your verification needs changes: {prof.data.profile.verification_note}{' '}
            <Link to="/helper/profile" className="font-semibold underline">
              Update and resubmit
            </Link>
          </Alert>
        )}
        {status === 'verified' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-leaf">
            <Seal size={22} /> You are verified and visible to households.
          </div>
        )}

        {has && (
          <>
            <section className="grid gap-6 rounded-xl border border-line bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
              <LoadState loading={stats.loading || earn.loading} error={stats.error || earn.error}>
                <Stat
                  label="Total earned"
                  value={money(earn.data?.total_earned)}
                  sub={`${earn.data?.completed_jobs} completed ${earn.data?.completed_jobs === 1 ? 'job' : 'jobs'}`}
                />
                <Stat
                  label="Expected from active jobs"
                  value={money(earn.data?.expected_from_active)}
                  sub={`${earn.data?.active_jobs} active`}
                />
                <div>
                  <div className="font-display text-3xl font-bold leading-tight">
                    {stats.data?.reliability.score}
                    <span className="text-lg text-ink-soft"> / 100</span>
                  </div>
                  <div className="text-sm font-medium">Reliability score</div>
                  <div className="text-xs text-ink-soft">Attendance and kept commitments</div>
                </div>
                <div>
                  <div className="mt-1">
                    <Stars value={stats.data?.rating.average} count={stats.data?.rating.reviews} />
                  </div>
                  <div className="mt-1 text-sm font-medium">Your rating</div>
                </div>
              </LoadState>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel
                title="Requests waiting for you"
                actions={
                  <Link to="/bookings" className="text-sm font-semibold underline">
                    All jobs
                  </Link>
                }
              >
                <LoadState loading={pending.loading} error={pending.error} onRetry={pending.reload}>
                  {pending.data?.bookings.length === 0 ? (
                    <p className="text-sm text-ink-soft">No pending requests right now.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {pending.data?.bookings.map((b) => (
                        <li key={b.id} className="py-3">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              to={`/bookings/${b.id}`}
                              className="font-semibold hover:underline"
                            >
                              {b.household_name}
                            </Link>
                            <StatusBadge value={b.phase} kind="booking" />
                          </div>
                          <div className="text-sm text-ink-soft">
                            {PLAN_LABEL[b.plan_type]} from {fdate(b.start_date)} ·{' '}
                            {money(b.total_price)}
                          </div>
                          {b.phase === 'awaiting_response' && (
                            <div className="mt-2 flex gap-2">
                              <RespondButtons
                                booking={b}
                                onDone={() => {
                                  pending.reload();
                                  earn.reload();
                                }}
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </LoadState>
              </Panel>

              <Panel
                title="Earnings by month"
                sub="Based on completed jobs. Payments are arranged directly with households."
              >
                <LoadState loading={earn.loading} error={earn.error}>
                  {earn.data?.by_month.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      Your earnings will appear here once you complete a job.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-ink-soft">
                          <th className="pb-2 font-semibold">Month</th>
                          <th className="pb-2 font-semibold">Jobs</th>
                          <th className="pb-2 text-right font-semibold">Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {earn.data?.by_month.map((m) => (
                          <tr key={m.month}>
                            <td className="py-2">{m.month}</td>
                            <td>{m.jobs}</td>
                            <td className="text-right font-semibold">{money(m.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </LoadState>
              </Panel>
            </div>
          </>
        )}
      </LoadState>
    </div>
  );
}
