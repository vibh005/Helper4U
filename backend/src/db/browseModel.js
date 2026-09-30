const { query } = require('../config/db');
const { buildWhere } = require('../utils/sqlWhere');

const PUBLIC_COLS = `
  p.id, u.name, u.city, p.service_type, p.bio, p.experience_years, p.skills, p.languages,
  p.available_days, p.available_from, p.available_to, p.availability_status, p.preferred_plans,
  p.hourly_rate, p.monthly_rate, p.yearly_rate, p.avg_rating, p.review_count,
  p.verified_at, TRUE AS verified`;

const BASE = `FROM helper_profiles p JOIN users u ON u.id = p.user_id`;

const ALWAYS = ["p.verification_status = 'verified'", 'u.is_active = TRUE'];

const RATE_COL = { hourly: 'p.hourly_rate', monthly: 'p.monthly_rate', yearly: 'p.yearly_rate' };

exports.search = async (f) => {
  const conds = [];
  if (f.service_type) conds.push(['p.service_type = ?', f.service_type]);
  if (f.min_experience !== undefined) conds.push(['p.experience_years >= ?', f.min_experience]);
  if (f.max_experience !== undefined) conds.push(['p.experience_years <= ?', f.max_experience]);
  if (f.availability) conds.push(['p.availability_status = ?', f.availability]);
  if (f.day) conds.push(['? = ANY(p.available_days)', f.day]);
  if (f.plan) conds.push(['? = ANY(p.preferred_plans)', f.plan]);
  if (f.max_price !== undefined) conds.push([`${RATE_COL[f.plan]} <= ?`, f.max_price]);
  if (f.min_rating !== undefined) conds.push(['p.avg_rating >= ?', f.min_rating]);
  if (f.city) conds.push(['u.city ILIKE ?', `%${f.city}%`]);
  if (f.search) conds.push(['(u.name ILIKE ? OR p.bio ILIKE ?)', `%${f.search}%`]);

  const { where, params } = buildWhere(conds, ALWAYS);

  const rate = RATE_COL[f.plan || 'hourly'];
  const ORDER = {
    rating: 'p.avg_rating DESC, p.review_count DESC',
    experience: 'p.experience_years DESC',
    newest: 'p.verified_at DESC',
    price_asc: `(${rate} IS NULL), ${rate} ASC`,
    price_desc: `(${rate} IS NULL), ${rate} DESC`,
  }[f.sort || 'rating'];

  const total = (await query(`SELECT COUNT(*) AS n ${BASE} ${where}`, params)).rows[0].n;
  const { rows } = await query(
    `SELECT ${PUBLIC_COLS} ${BASE} ${where} ORDER BY ${ORDER}, p.id ASC
     LIMIT ${Number(f.limit)} OFFSET ${Number(f.offset)}`,
    params,
  );
  return { rows, total };
};

exports.findOne = async (id) => {
  const { where, params } = buildWhere([['p.id = ?', id]], ALWAYS);
  return (await query(`SELECT ${PUBLIC_COLS} ${BASE} ${where}`, params)).rows[0];
};
