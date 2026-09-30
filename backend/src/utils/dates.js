const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (dt) => dt.toISOString().slice(0, 10);

exports.isValidDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const dt = parse(s);
  return !Number.isNaN(dt.getTime()) && fmt(dt) === s;
};

exports.today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata' });

exports.addDays = (s, n) => {
  const dt = parse(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmt(dt);
};

exports.addMonths = (s, n) => {
  const dt = parse(s);
  const day = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + n);
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(day, last));
  return fmt(dt);
};

exports.weekday = (s) => DAY_NAMES[parse(s).getUTCDay()];

exports.eachDate = function* (start, end) {
  for (let d = parse(start); d <= parse(end); d.setUTCDate(d.getUTCDate() + 1)) yield fmt(d);
};

exports.maxDate = (a, b) => (a > b ? a : b);
exports.minDate = (a, b) => (a < b ? a : b);

exports.toMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};
