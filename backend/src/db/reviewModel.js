const { query } = require('../config/db');

exports.create = async (r) =>
  (
    await query(
      `INSERT INTO reviews (booking_id, household_id, helper_id, rating, comment)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, booking_id, helper_id, rating, comment, created_at`,
      [r.booking_id, r.household_id, r.helper_id, r.rating, r.comment || null],
    )
  ).rows[0];

exports.findById = async (id) => (await query('SELECT * FROM reviews WHERE id = $1', [id])).rows[0];
exports.findByBooking = async (bookingId) =>
  (await query('SELECT * FROM reviews WHERE booking_id = $1', [bookingId])).rows[0];
exports.remove = async (id) => query('DELETE FROM reviews WHERE id = $1', [id]);

exports.recomputeHelper = async (helperId) => {
  const { n, s } = (
    await query(
      'SELECT COUNT(*) AS n, COALESCE(SUM(rating), 0) AS s FROM reviews WHERE helper_id = $1',
      [helperId],
    )
  ).rows[0];
  const avg = n ? Math.round((Number(s) / n) * 100) / 100 : 0;
  await query(
    'UPDATE helper_profiles SET avg_rating = $2, review_count = $3, updated_at = NOW() WHERE id = $1',
    [helperId, avg, n],
  );
};

exports.listForHelper = async (helperId, { limit, offset }) => {
  const total = (await query('SELECT COUNT(*) AS n FROM reviews WHERE helper_id = $1', [helperId]))
    .rows[0].n;
  const { rows } = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
     FROM reviews r JOIN users u ON u.id = r.household_id WHERE r.helper_id = $1
     ORDER BY r.created_at DESC, r.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    [helperId],
  );
  return { rows, total };
};
