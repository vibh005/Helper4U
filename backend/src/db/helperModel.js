const { query } = require('../config/db');

const FIELDS = [
  'service_type',
  'bio',
  'experience_years',
  'skills',
  'languages',
  'available_days',
  'available_from',
  'available_to',
  'availability_status',
  'preferred_plans',
  'hourly_rate',
  'monthly_rate',
  'yearly_rate',
];

exports.findByUserId = async (userId) => {
  const { rows } = await query('SELECT * FROM helper_profiles WHERE user_id = $1', [userId]);
  return rows[0];
};

exports.create = async (userId, data) => {
  const cols = ['user_id', ...FIELDS.filter((f) => data[f] !== undefined)];
  const vals = [userId, ...FIELDS.filter((f) => data[f] !== undefined).map((f) => data[f])];
  const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO helper_profiles (${cols.join(', ')}) VALUES (${ph}) RETURNING *`,
    vals,
  );
  return rows[0];
};

exports.update = async (id, data) => {
  const keys = FIELDS.filter((f) => data[f] !== undefined);
  if (!keys.length)
    return (await query('SELECT * FROM helper_profiles WHERE id = $1', [id])).rows[0];
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await query(
    `UPDATE helper_profiles SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...keys.map((k) => data[k])],
  );
  return rows[0];
};

exports.setVerificationStatus = async (id, status) => {
  const { rows } = await query(
    `UPDATE helper_profiles SET verification_status = $2, verification_note = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0];
};

exports.addDocument = async (helperId, d) => {
  const { rows } = await query(
    `INSERT INTO helper_documents (helper_id, doc_type, original_name, stored_name, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, helper_id, doc_type, original_name, mime_type, size_bytes, status, uploaded_at`,
    [helperId, d.doc_type, d.original_name, d.stored_name, d.mime_type, d.size_bytes],
  );
  return rows[0];
};

exports.listDocuments = async (helperId) => {
  const { rows } = await query(
    `SELECT id, helper_id, doc_type, original_name, mime_type, size_bytes, status, uploaded_at
     FROM helper_documents WHERE helper_id = $1 ORDER BY uploaded_at DESC, id DESC`,
    [helperId],
  );
  return rows;
};

exports.getDocument = async (docId) => {
  const { rows } = await query(
    `SELECT d.*, p.user_id FROM helper_documents d
     JOIN helper_profiles p ON p.id = d.helper_id WHERE d.id = $1`,
    [docId],
  );
  return rows[0];
};

exports.deleteDocument = async (docId) => {
  await query('DELETE FROM helper_documents WHERE id = $1', [docId]);
};
