const { query } = require('../config/db');

exports.list = async ({ activeOnly = false } = {}) => {
  const { rows } = await query(
    `SELECT id, slug, name, description, is_active FROM service_categories
     ${activeOnly ? 'WHERE is_active = TRUE' : ''} ORDER BY name`,
  );
  return rows;
};

exports.findById = async (id) =>
  (
    await query(
      'SELECT id, slug, name, description, is_active FROM service_categories WHERE id = $1',
      [id],
    )
  ).rows[0];

exports.isActiveSlug = async (slug) =>
  (await query('SELECT 1 FROM service_categories WHERE slug = $1 AND is_active = TRUE', [slug]))
    .rows.length > 0;

exports.create = async ({ slug, name, description }) =>
  (
    await query(
      `INSERT INTO service_categories (slug, name, description) VALUES ($1, $2, $3)
     RETURNING id, slug, name, description, is_active`,
      [slug, name, description || null],
    )
  ).rows[0];

exports.update = async (id, { name, description, is_active }) =>
  (
    await query(
      `UPDATE service_categories SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       is_active = COALESCE($4, is_active)
     WHERE id = $1 RETURNING id, slug, name, description, is_active`,
      [id, name ?? null, description ?? null, is_active ?? null],
    )
  ).rows[0];
