export const money = (n) =>
  n == null
    ? '-'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);

export const fdate = (s) => {
  if (!s) return '-';
  const d = new Date(String(s).length === 10 ? `${s}T00:00:00` : s);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ftime = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};

export const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
export const todayStr = () => new Date().toLocaleDateString('en-CA');

export const PLAN_LABEL = { hourly: 'Hourly', monthly: 'Monthly', yearly: 'Yearly' };
export const PLAN_UNIT = { hourly: 'hour', monthly: 'month', yearly: 'year' };
export const rateText = (plan, rate) => `${money(rate)} / ${PLAN_UNIT[plan]}`;

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOC_TYPES = {
  identity: 'Identity proof',
  address_proof: 'Address proof',
  police_verification: 'Police verification',
  background_check: 'Background check',
  other: 'Other',
};
export const COMPLAINT_CATEGORIES = {
  no_show: 'Did not show up',
  misconduct: 'Misconduct',
  payment: 'Payment issue',
  quality: 'Quality of service',
  other: 'Something else',
};
export const EXPERIENCE_LEVELS = {
  entry: 'Entry (0-2 years)',
  intermediate: 'Intermediate (3-5 years)',
  expert: 'Expert (6+ years)',
};

export const fullDateTime = (s) =>
  s
    ? new Date(s).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
