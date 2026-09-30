const { query } = require('../config/db');
const { buildWhere } = require('../utils/sqlWhere');

const SELECT = `
  SELECT c.*, cu.name AS complainant_name, cu.role AS complainant_role,
         au.name AS against_name, au.role AS against_role
  FROM complaints c
  JOIN users cu ON cu.id = c.complainant_id
  JOIN users au ON au.id = c.against_id`;

exports.create = async (c) =>
  (
    await query(
      `INSERT INTO complaints (booking_id, complainant_id, against_id, category, description)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [c.booking_id, c.complainant_id, c.against_id, c.category, c.description],
    )
  ).rows[0].id;

exports.findById = async (id) => (await query(`${SELECT} WHERE c.id = $1`, [id])).rows[0];

exports.list = async ({ complainant_id, status, category, limit, offset }) => {
  const conds = [];
  if (complainant_id) conds.push(['c.complainant_id = ?', complainant_id]);
  if (status) conds.push(['c.status = ?', status]);
  if (category) conds.push(['c.category = ?', category]);
  const { where, params } = buildWhere(conds);
  const total = (await query(`SELECT COUNT(*) AS n FROM complaints c ${where}`, params)).rows[0].n;
  const { rows } = await query(
    `${SELECT} ${where} ORDER BY c.created_at DESC, c.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return { rows, total };
};

exports.resolve = async (id, { status, resolution_note }, adminId) =>
  (
    await query(
      `UPDATE complaints SET status = $2, resolution_note = COALESCE($3, resolution_note),
       resolved_by = $4, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [
        id,
        status,
        resolution_note || null,
        ['resolved', 'dismissed'].includes(status) ? adminId : null,
      ],
    )
  ).rows[0];
