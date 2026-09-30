const { query, withTransaction } = require('../config/db');
const { buildWhere } = require('../utils/sqlWhere');

exports.withTransaction = withTransaction;

const SELECT = `
  SELECT b.*, hp.user_id AS helper_user_id, hp.service_type,
         hu.name AS helper_name, hu.phone AS helper_phone, hu.city AS helper_city, hp.avg_rating AS helper_rating,
         hh.name AS household_name, hh.phone AS household_phone, hh.city AS household_city,
         rv.id AS review_id, rv.rating AS review_rating
  FROM bookings b
  JOIN helper_profiles hp ON hp.id = b.helper_id
  JOIN users hu ON hu.id = hp.user_id
  JOIN users hh ON hh.id = b.household_id
  LEFT JOIN reviews rv ON rv.booking_id = b.id`;

// The helper as needed for validating a new booking (must be a verified, active helper)
exports.getBookableHelper = async (helperId) =>
  (await query(
    `SELECT hp.*, u.is_active FROM helper_profiles hp JOIN users u ON u.id = hp.user_id
     WHERE hp.id = $1 AND hp.verification_status = 'verified' AND u.is_active = TRUE`,
    [helperId]
  )).rows[0];

exports.create = async (b) =>
  (await query(
    `INSERT INTO bookings (household_id, helper_id, plan_type, start_date, end_date, start_time, end_time,
       schedule_days, quantity, rate, total_price, address, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [b.household_id, b.helper_id, b.plan_type, b.start_date, b.end_date, b.start_time, b.end_time,
     b.schedule_days, b.quantity, b.rate, b.total_price, b.address, b.notes || null]
  )).rows[0].id;

exports.getById = async (id, q = query) => (await q(`${SELECT} WHERE b.id = $1`, [id])).rows[0];

exports.list = async ({ household_id, helper_id, status, plan_type, from, to, limit, offset }) => {
  const conds = [];
  if (household_id) conds.push(['b.household_id = ?', household_id]);
  if (helper_id) conds.push(['b.helper_id = ?', helper_id]);
  if (status) conds.push(['b.status = ?', status]);
  if (plan_type) conds.push(['b.plan_type = ?', plan_type]);
  if (from) conds.push(['b.end_date >= ?', from]);   // bookings still active on/after `from`
  if (to) conds.push(['b.start_date <= ?', to]);
  const { where, params } = buildWhere(conds);
  const total = (await query(`SELECT COUNT(*) AS n FROM bookings b ${where}`, params)).rows[0].n;
  const { rows } = await query(
    `${SELECT} ${where} ORDER BY b.created_at DESC, b.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return { rows, total };
};

// Accepted bookings of a helper that overlap the given date range (used for double-booking checks)
exports.acceptedOverlapping = async (helperId, start, end, excludeId = 0, q = query) =>
  (await q(
    `SELECT id, start_date, end_date, start_time, end_time, schedule_days FROM bookings
     WHERE helper_id = $1 AND status = 'accepted' AND start_date <= $3 AND end_date >= $2 AND id <> $4`,
    [helperId, start, end, excludeId]
  )).rows;

// Locks the helper row so two simultaneous accepts cannot both pass the conflict check
exports.lockHelper = (client, helperId) => client.query('SELECT id FROM helper_profiles WHERE id = $1 FOR UPDATE', [helperId]);

// Status changes are conditional (WHERE status = ...) so a stale request can never overwrite a newer state.
exports.respond = async (id, status, reason, q = query) =>
  (await q(
    `UPDATE bookings SET status = $2, rejection_reason = $3, responded_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending' RETURNING id`,
    [id, status, reason || null]
  )).rows[0];

exports.cancel = async (id, by, reason) =>
  (await query(
    `UPDATE bookings SET status = 'cancelled', cancelled_by = $2, cancel_reason = $3, updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'accepted') RETURNING id`,
    [id, by, reason || null]
  )).rows[0];

exports.complete = async (id) =>
  (await query(
    `UPDATE bookings SET status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'accepted' RETURNING id`,
    [id]
  )).rows[0];

// ----- attendance -----
exports.markAttendance = async (bookingId, date, status, note) => {
  const existing = (await query('SELECT id FROM booking_attendance WHERE booking_id = $1 AND work_date = $2', [bookingId, date])).rows[0];
  if (existing) {
    return (await query(
      `UPDATE booking_attendance SET status = $2, note = $3, marked_at = NOW() WHERE id = $1
       RETURNING id, booking_id, work_date, status, note`,
      [existing.id, status, note || null]
    )).rows[0];
  }
  return (await query(
    `INSERT INTO booking_attendance (booking_id, work_date, status, note) VALUES ($1,$2,$3,$4)
     RETURNING id, booking_id, work_date, status, note`,
    [bookingId, date, status, note || null]
  )).rows[0];
};

exports.listAttendance = async (bookingId) =>
  (await query(
    'SELECT id, work_date, status, note FROM booking_attendance WHERE booking_id = $1 ORDER BY work_date',
    [bookingId]
  )).rows;
