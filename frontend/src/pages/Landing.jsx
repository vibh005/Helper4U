import { Link, Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext';
import { Seal, Monogram, Stars, PageLoader } from '../components/ui';

const STEPS = [
  ['Helpers apply', 'Every maid, babysitter and nanny uploads an identity document and any background checks.'],
  ['Our team checks', 'An admin reviews each document. Only approved helpers get the verified seal and can be booked.'],
  ['You book with confidence', 'Pick a plan, send a request, and the helper confirms. You see their phone number only after they accept.'],
];

const PLANS = [
  ['Hourly', 'One-off help for a few hours, such as deep cleaning or an evening of babysitting.'],
  ['Monthly', 'A regular helper on the days you choose, for one to eleven months.'],
  ['Yearly', 'Long-term care with a fixed yearly rate, for up to three years.'],
];

export default function Landing() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-6xl">Help at home, verified before they knock.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Find maids, babysitters and nannies whose identity and background have been checked by our team. Book by the hour, month or year.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-lg bg-marigold px-6 py-3 font-semibold text-ink hover:bg-[#e2a400]">Find a helper</Link>
            <Link to="/register?role=helper" className="rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-wash">Offer your services</Link>
          </div>
        </div>

        {/* an illustration of what a verified profile looks like */}
        <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
          <div className="absolute -left-3 -top-3 h-full w-full rounded-2xl bg-ink" />
          <div className="relative rounded-2xl border border-ink bg-white p-6">
            <div className="flex items-center gap-4">
              <Monogram name="Sample Helper" size={56} />
              <div>
                <div className="flex items-center gap-2 font-display text-xl font-bold">Sample profile <Seal size={22} /></div>
                <div className="text-sm text-ink-soft">Nanny, 6 years of experience</div>
              </div>
            </div>
            <div className="mt-4"><Stars value={5} count={24} /></div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {['Identity checked', 'Address proof', 'Police verification'].map((t) => (
                <span key={t} className="rounded-full bg-leaf/10 px-2.5 py-1 text-leaf">{t}</span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-sm">
              {[['Hourly', 'Rs 250'], ['Monthly', 'Rs 18,000'], ['Yearly', 'Rs 2,00,000']].map(([k, v]) => (
                <div key={k}><div className="text-xs text-ink-soft">{k}</div><div className="font-semibold">{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold">How verification works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4">
              <div className="font-display text-sm font-bold text-ink-soft">Step {i + 1}</div>
              <h3 className="mt-1 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-ink p-8 text-white sm:p-12">
        <h2 className="text-3xl font-bold">Pick the plan that fits your home</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {PLANS.map(([t, d]) => (
            <div key={t}>
              <h3 className="text-xl font-semibold text-marigold">{t}</h3>
              <p className="mt-2 text-white/80">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-white/70">Prices are set by each helper and locked in when you book, so they never change mid-plan.</p>
      </section>
    </div>
  );
}
