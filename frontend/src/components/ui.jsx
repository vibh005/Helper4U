import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { errMsg } from '../api';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- data loading ---------- */
export function useFetch(fn, deps = []) {
  const [state, set] = useState({ data: null, loading: true, error: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    set((s) => ({ ...s, loading: true, error: null }));
    try {
      set({ data: await fn(), loading: false, error: null });
    } catch (e) {
      set({ data: null, loading: false, error: errMsg(e) });
    }
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, tone = 'good') => {
    const id = Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('rounded-lg px-4 py-3 text-sm font-medium shadow-lg', t.tone === 'bad' ? 'bg-rose text-white' : 'bg-ink text-white')}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- buttons & fields ---------- */
const BTN = {
  primary: 'bg-ink text-white hover:bg-[#141d42]',
  accent: 'bg-marigold text-ink hover:bg-[#e2a400]',
  secondary: 'border border-line bg-white text-ink hover:bg-wash',
  danger: 'bg-rose text-white hover:bg-[#9a2a47]',
  ghost: 'text-ink hover:bg-wash',
};

export function Spinner({ small }) {
  return (
    <span
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', small ? 'h-4 w-4' : 'h-6 w-6')}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...p }) {
  return (
    <button
      type="button"
      {...p}
      disabled={p.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        BTN[variant],
        className
      )}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60';
export const Input = (p) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p) => <select {...p} className={cx(inputCls, p.className)} />;
export const Textarea = (p) => <textarea rows={3} {...p} className={cx(inputCls, p.className)} />;

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('block text-sm', className)}>
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose">{error}</span>}
    </label>
  );
}

export function Checks({ options, value, onChange, disabledOptions = [] }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        const disabled = disabledOptions.includes(o);
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => toggle(o)}
            className={cx(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors disabled:opacity-40',
              on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-wash'
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- feedback ---------- */
const TONES = {
  good: 'bg-leaf/10 text-leaf',
  warn: 'bg-marigold/25 text-[#6b4b00]',
  bad: 'bg-rose/10 text-rose',
  neutral: 'bg-wash text-ink-soft',
  info: 'bg-ink/10 text-ink',
};

export const Badge = ({ tone = 'neutral', children }) => (
  <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone])}>{children}</span>
);

const STATUS = {
  // bookings (phase)
  awaiting_response: ['warn', 'Awaiting response'],
  expired: ['neutral', 'Expired'],
  upcoming: ['info', 'Upcoming'],
  ongoing: ['good', 'In progress'],
  ready_to_complete: ['warn', 'Ready to complete'],
  accepted: ['info', 'Accepted'],
  completed: ['good', 'Completed'],
  cancelled: ['neutral', 'Cancelled'],
  // helpers / documents / complaints
  pending: ['warn', 'Pending'],
  rejected: ['bad', 'Rejected'],
  unverified: ['neutral', 'Not verified'],
  verified: ['good', 'Verified'],
  approved: ['good', 'Approved'],
  open: ['warn', 'Open'],
  in_review: ['info', 'In review'],
  resolved: ['good', 'Resolved'],
  dismissed: ['neutral', 'Dismissed'],
  available: ['good', 'Available'],
  busy: ['warn', 'Busy'],
  unavailable: ['neutral', 'Unavailable'],
  present: ['good', 'Present'],
  absent: ['bad', 'Absent'],
};
export function StatusBadge({ value, kind }) {
  if (kind === 'booking' && value === 'rejected') return <Badge tone="neutral">Declined</Badge>;
  const [tone, label] = STATUS[value] || ['neutral', value];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Alert({ tone = 'bad', children, className }) {
  const t = { bad: 'border-rose/30 bg-rose/5 text-rose', good: 'border-leaf/30 bg-leaf/5 text-leaf', warn: 'border-marigold/60 bg-marigold/15 text-[#5c4100]', info: 'border-ink/20 bg-ink/5 text-ink' };
  return <div role={tone === 'bad' ? 'alert' : 'status'} className={cx('rounded-lg border px-4 py-3 text-sm', t[tone], className)}>{children}</div>;
}

export function PageLoader() {
  return <div className="flex justify-center py-20 text-ink-soft"><Spinner /></div>;
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function LoadState({ loading, error, onRetry, children }) {
  if (loading) return <PageLoader />;
  if (error) return <Alert>{error} {onRetry && <button className="ml-2 font-semibold underline" onClick={onRetry}>Try again</button>}</Alert>;
  return children;
}

/* ---------- layout helpers ---------- */
export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-ink-soft">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export const Panel = ({ title, sub, actions, children, className }) => (
  <section className={cx('rounded-xl border border-line bg-white', className)}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {sub && <p className="text-sm text-ink-soft">{sub}</p>}
        </div>
        {actions}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-ink-soft">Page {page} of {pages}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </nav>
  );
}

export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ---------- identity marks ---------- */
export function Monogram({ name = '?', size = 44 }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// The verification seal: a scalloped marigold stamp with a check, used wherever a helper is verified.
const sealPoints = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 ? 9.6 : 11.4;
  const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

export function Seal({ size = 20, title = 'Verified by Helper4U' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title} className="shrink-0">
      <title>{title}</title>
      <polygon points={sealPoints} fill="#f5b301" />
      <path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#1e2a5a" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Stars({ value = 0, count }) {
  const r = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" title={`${value} out of 5`}>
      <span className="text-[#c48a00]" aria-hidden="true">{'★'.repeat(r)}<span className="text-line">{'★'.repeat(5 - r)}</span></span>
      <span className="text-ink-soft">
        {count === 0 ? 'No reviews yet' : <><span className="font-semibold text-ink">{Number(value).toFixed(1)}</span>{count != null && ` (${count})`}</>}
      </span>
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className={cx('text-3xl leading-none transition-colors', n <= value ? 'text-[#c48a00]' : 'text-line hover:text-marigold')}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export const Stat = ({ label, value, sub }) => (
  <div>
    <div className="font-display text-3xl font-bold leading-tight">{value}</div>
    <div className="text-sm font-medium text-ink">{label}</div>
    {sub && <div className="text-xs text-ink-soft">{sub}</div>}
  </div>
);

export const DL = ({ items }) => (
  <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
    {items.filter(Boolean).map(([k, v]) => (
      <div key={k}>
        <dt className="text-xs font-semibold text-ink-soft">{k}</dt>
        <dd className="mt-0.5 text-sm">{v || '-'}</dd>
      </div>
    ))}
  </dl>
);
