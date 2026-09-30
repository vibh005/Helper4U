const { query } = require('../config/db');

const { buildWhere } = require('../utils/sqlWhere');

exports.listHelpers = async ({ status, service_type, search, limit, offset }) => {
  const conds = [];
  if (status) conds.push(['p.verification_status = ?', status]);
  if (service_type) conds.push(['p.service_type = ?', service_type]);
  if (search) conds.push(['(u.name ILIKE ? OR u.email ILIKE ?)', `%${search}%`]);
  const { where, params } = buildWhere(conds);
  const base = `FROM helper_profiles p JOIN users u ON u.id = p.user_id ${where}`;
  const total = (await query(`SELECT COUNT(*) AS n ${base}`, params)).rows[0].n;
  const { rows } = await query(
    `SELECT p.id, p.user_id, p.service_type, p.experience_years, p.verification_status, p.updated_at,
            u.name, u.email, u.phone, u.city, u.is_active
     ${base} ORDER BY p.updated_at DESC, p.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return { rows, total };
};

exports.getHelperDetail = async (profileId) => {
  const { rows } = await query(
    `SELECT p.*, u.name, u.email, u.phone, u.city, u.is_active
     FROM helper_profiles p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
    [profileId]
  );
  if (!rows[0]) return null;
  const docs = await query(
    `SELECT id, doc_type, original_name, mime_type, size_bytes, status, uploaded_at
     FROM helper_documents WHERE helper_id = $1 ORDER BY uploaded_at DESC, id DESC`,
    [profileId]
  );
  return { ...rows[0], documents: docs.rows };
};

exports.setDocumentStatus = async (docId, status) =>
  (await query(
    `UPDATE helper_documents SET status = $2 WHERE id = $1
     RETURNING id, helper_id, doc_type, original_name, status`,
    [docId, status]
  )).rows[0];

exports.hasApprovedIdentity = async (profileId) =>
  (await query(
    `SELECT 1 FROM helper_documents WHERE helper_id = $1 AND doc_type = 'identity' AND status = 'approved'`,
    [profileId]
  )).rows.length > 0;

exports.decideVerification = async (profileId, status, note) =>
  (await query(
    `UPDATE helper_profiles SET verification_status = $2, verification_note = $3,
       verified_at = CASE WHEN $2 = 'verified' THEN NOW() ELSE NULL END, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [profileId, status, note || null]
  )).rows[0];

exports.getProfile = async (id) => (await query('SELECT * FROM helper_profiles WHERE id = $1', [id])).rows[0];

// ----- users -----
exports.listUsers = async ({ role, active, search, limit, offset }) => {
  const conds = [];
  if (role) conds.push(['role = ?', role]);
  if (active !== undefined) conds.push(['is_active = ?', active]);
  if (search) conds.push(['(name ILIKE ? OR email ILIKE ?)', `%${search}%`]);
  const { where, params } = buildWhere(conds);
  const total = (await query(`SELECT COUNT(*) AS n FROM users ${where}`, params)).rows[0].n;
  const { rows } = await query(
    `SELECT id, name, email, phone, role, city, is_active, created_at FROM users ${where}
     ORDER BY created_at DESC, id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  return { rows, total };
};

exports.setUserActive = async (id, isActive) =>
  (await query(
    `UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1
     RETURNING id, name, email, role, is_active`,
    [id, isActive]
  )).rows[0];

exports.findUser = async (id) => (await query('SELECT id, role FROM users WHERE id = $1', [id])).rows[0];
