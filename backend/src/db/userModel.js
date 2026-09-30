const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Columns that are safe to send to the client (never the password)
const PUBLIC = 'id, name, email, phone, role, city, is_active, created_at, updated_at';

exports.create = async ({ name, email, password, phone, city, role }) => {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (name, email, password, phone, city, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${PUBLIC}`,
    [name, email.toLowerCase().trim(), hash, phone || null, city || null, role || 'household']
  );
  return rows[0];
};

exports.findByEmailWithPassword = async (email) => {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  return rows[0];
};

exports.findById = async (id) => {
  const { rows } = await query(`SELECT ${PUBLIC} FROM users WHERE id = $1`, [id]);
  return rows[0];
};

exports.findByIdWithPassword = async (id) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};

exports.updateProfile = async (id, { name, phone, city }) => {
  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($2, name),
       phone = COALESCE($3, phone),
       city = COALESCE($4, city),
       updated_at = NOW()
     WHERE id = $1 RETURNING ${PUBLIC}`,
    [id, name ?? null, phone ?? null, city ?? null]
  );
  return rows[0];
};

exports.updatePassword = async (id, newPassword) => {
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1', [id, hash]);
};

exports.checkPassword = (plain, hash) => bcrypt.compare(plain, hash);

exports.stripPassword = (row) => {
  const { password, ...safe } = row;
  return safe;
};
