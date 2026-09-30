const { query } = require('../config/db');

exports.reliability = async (helperId) => {
  const hp = helperId ? 'WHERE b.helper_id = $1' : '';
  const hb = helperId ? 'AND helper_id = $1' : '';
  const params = helperId ? [helperId] : [];

  const att = (
    await query(
      `SELECT a.status, COUNT(*) AS n FROM booking_attendance a JOIN bookings b ON b.id = a.booking_id ${hp} GROUP BY a.status`,
      params,
    )
  ).rows;
  const present = att.find((r) => r.status === 'present')?.n || 0;
  const absent = att.find((r) => r.status === 'absent')?.n || 0;

  const bk = (
    await query(
      `SELECT status, cancelled_by, COUNT(*) AS n FROM bookings
     WHERE responded_at IS NOT NULL ${hb} GROUP BY status, cancelled_by`,
      params,
    )
  ).rows;
  const sum = (f) => bk.filter(f).reduce((t, r) => t + r.n, 0);
  const accepted_total = sum((r) => ['accepted', 'completed', 'cancelled'].includes(r.status));
  const helper_cancellations = sum((r) => r.status === 'cancelled' && r.cancelled_by === 'helper');

  const marked = present + absent;
  const attendanceRate = marked ? present / marked : 1;
  const cancelRate = accepted_total ? helper_cancellations / accepted_total : 0;
  return {
    score: Math.round(100 * attendanceRate * (1 - cancelRate)),
    days_present: present,
    days_absent: absent,
    accepted_bookings: accepted_total,
    helper_cancellations,
  };
};

exports.earnings = async (helperId) => {
  const rows = (
    await query(
      `SELECT id, plan_type, status, total_price, completed_at FROM bookings
     WHERE helper_id = $1 AND status IN ('completed', 'accepted')`,
      [helperId],
    )
  ).rows;
  const tz = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  const monthOf = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz }).slice(0, 7);

  const done = rows.filter((r) => r.status === 'completed');
  const upcoming = rows.filter((r) => r.status === 'accepted');
  const byMonth = {};
  for (const r of done) {
    const m = monthOf(r.completed_at);
    byMonth[m] = byMonth[m] || { month: m, total: 0, jobs: 0 };
    byMonth[m].total += Number(r.total_price);
    byMonth[m].jobs += 1;
  }
  const round2 = (n) => Math.round(n * 100) / 100;
  return {
    total_earned: round2(done.reduce((t, r) => t + Number(r.total_price), 0)),
    completed_jobs: done.length,
    expected_from_active: round2(upcoming.reduce((t, r) => t + Number(r.total_price), 0)),
    active_jobs: upcoming.length,
    by_month: Object.values(byMonth)
      .map((m) => ({ ...m, total: round2(m.total) }))
      .sort((a, b) => b.month.localeCompare(a.month)),
  };
};

const countBy = async (sql, params = []) =>
  Object.fromEntries((await query(sql, params)).rows.map((r) => [r.k, r.n]));

exports.analytics = async () => {
  const since30 = new Date(Date.now() - 30 * 86400000);
  const since6m = new Date();
  since6m.setMonth(since6m.getMonth() - 5);
  since6m.setDate(1);
  since6m.setHours(0, 0, 0, 0);

  const users = await countBy('SELECT role AS k, COUNT(*) AS n FROM users GROUP BY role');
  const helperStatus = await countBy(
    'SELECT verification_status AS k, COUNT(*) AS n FROM helper_profiles GROUP BY verification_status',
  );
  const bookingStatus = await countBy(
    'SELECT status AS k, COUNT(*) AS n FROM bookings GROUP BY status',
  );
  const complaintStatus = await countBy(
    'SELECT status AS k, COUNT(*) AS n FROM complaints GROUP BY status',
  );
  const byService = await countBy(
    `SELECT hp.service_type AS k, COUNT(*) AS n FROM bookings b JOIN helper_profiles hp ON hp.id = b.helper_id GROUP BY hp.service_type`,
  );
  const byPlan = await countBy(
    'SELECT plan_type AS k, COUNT(*) AS n FROM bookings GROUP BY plan_type',
  );

  const mau = (await query('SELECT COUNT(*) AS n FROM users WHERE last_login_at >= $1', [since30]))
    .rows[0].n;
  const revenue = (
    await query(
      `SELECT COALESCE(SUM(total_price), 0) AS s FROM bookings WHERE status = 'completed'`,
    )
  ).rows[0].s;
  const rev = (await query('SELECT COUNT(*) AS n, COALESCE(SUM(rating), 0) AS s FROM reviews'))
    .rows[0];
  const reliability = await exports.reliability(null);

  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const completed = bookingStatus.completed || 0;
  const cancelled = bookingStatus.cancelled || 0;
  const accepted = bookingStatus.accepted || 0;
  const rejected = bookingStatus.rejected || 0;

  const newUsers = (await query('SELECT created_at FROM users WHERE created_at >= $1', [since6m]))
    .rows;
  const newBookings = (
    await query('SELECT created_at FROM bookings WHERE created_at >= $1', [since6m])
  ).rows;
  const tz = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  const monthOf = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz }).slice(0, 7);
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(since6m);
    d.setMonth(d.getMonth() + i);
    months.push(d.toLocaleDateString('en-CA').slice(0, 7));
  }
  const trend = months.map((m) => ({
    month: m,
    registrations: newUsers.filter((r) => monthOf(r.created_at) === m).length,
    bookings: newBookings.filter((r) => monthOf(r.created_at) === m).length,
  }));

  return {
    kpis: {
      registered_households: users.household || 0,
      registered_helpers: users.helper || 0,
      verified_helpers: helperStatus.verified || 0,
      pending_verifications: helperStatus.pending || 0,
      total_bookings: Object.values(bookingStatus).reduce((t, n) => t + n, 0),

      booking_completion_rate: pct(completed, completed + cancelled),
      acceptance_rate: pct(
        accepted + completed + cancelled,
        accepted + completed + cancelled + rejected,
      ),
      helper_reliability_score: reliability.score,
      customer_satisfaction: rev.n ? Math.round((Number(rev.s) / rev.n) * 100) / 100 : null,
      total_reviews: rev.n,
      monthly_active_users: mau,
      completed_booking_value: Number(revenue),
      open_complaints: (complaintStatus.open || 0) + (complaintStatus.in_review || 0),
    },
    bookings_by_status: bookingStatus,
    bookings_by_service: byService,
    bookings_by_plan: byPlan,
    helper_verification: helperStatus,
    complaints_by_status: complaintStatus,
    reliability,
    trend,
  };
};

exports.listAttendance = async ({ status, from, to, limit, offset }) => {
  const { buildWhere } = require('../utils/sqlWhere');
  const conds = [];
  if (status) conds.push(['a.status = ?', status]);
  if (from) conds.push(['a.work_date >= ?', from]);
  if (to) conds.push(['a.work_date <= ?', to]);
  const { where, params } = buildWhere(conds);
  const base = `FROM booking_attendance a JOIN bookings b ON b.id = a.booking_id
     JOIN helper_profiles hp ON hp.id = b.helper_id JOIN users hu ON hu.id = hp.user_id JOIN users hh ON hh.id = b.household_id ${where}`;
  const total = (await query(`SELECT COUNT(*) AS n ${base}`, params)).rows[0].n;
  const { rows } = await query(
    `SELECT a.id, a.booking_id, a.work_date, a.status, a.note, hu.name AS helper_name, hh.name AS household_name, hp.service_type
     ${base} ORDER BY a.work_date DESC, a.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return { rows, total };
};
