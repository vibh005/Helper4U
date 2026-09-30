const { query } = require('../config/db');

const FIELDS = ['address', 'pincode', 'family_size', 'children_count', 'has_pets', 'notes'];

exports.findByUserId = async (userId) =>
  (await query('SELECT * FROM household_profiles WHERE user_id = $1', [userId])).rows[0];

exports.create = async (userId, data) => {
  const keys = FIELDS.filter((f) => data[f] !== undefined);
  const cols = ['user_id', ...keys];
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  return (await query(
    `INSERT INTO household_profiles (${cols.join(', ')}) VALUES (${ph}) RETURNING *`,
    [userId, ...keys.map((k) => data[k])]
  )).rows[0];
};

exports.update = async (id, data) => {
  const keys = FIELDS.filter((f) => data[f] !== undefined);
  if (!keys.length) return (await query('SELECT * FROM household_profiles WHERE id = $1', [id])).rows[0];
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return (await query(
    `UPDATE household_profiles SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...keys.map((k) => data[k])]
  )).rows[0];
};
