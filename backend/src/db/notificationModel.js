const { query } = require('../config/db');

exports.create = async (userId, { type, title, message, link }) =>
  query('INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,$2,$3,$4,$5)',
    [userId, type, title, message || null, link || null]);

exports.list = async (userId, { unreadOnly, limit, offset }) => {
  const where = `WHERE user_id = $1 ${unreadOnly ? 'AND is_read = FALSE' : ''}`;
  const total = (await query(`SELECT COUNT(*) AS n FROM notifications ${where}`, [userId])).rows[0].n;
  const { rows } = await query(
    `SELECT id, type, title, message, link, is_read, created_at FROM notifications ${where}
     ORDER BY created_at DESC, id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`, [userId]);
  return { rows, total };
};

exports.unreadCount = async (userId) =>
  (await query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId])).rows[0].n;

exports.markRead = async (id, userId) =>
  (await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).rows[0];

exports.markAllRead = async (userId) =>
  query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
