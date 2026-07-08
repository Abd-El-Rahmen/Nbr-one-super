const db = require('../../config/db');

const findAll = async () => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] || null;
};

const findBySlug = async (slug) => {
  const [rows] = await db.query('SELECT id FROM categories WHERE slug = ?', [slug]);
  return rows[0] || null;
};

const create = async ({ name, slug, image_url }) => {
  const [result] = await db.query(
    'INSERT INTO categories (name, slug, image_url) VALUES (?, ?, ?)',
    [name, slug, image_url || null]
  );
  return result.insertId;
};

const update = async (id, { name, slug, image_url }) => {
  if (image_url !== undefined) {
    await db.query('UPDATE categories SET name = ?, slug = ?, image_url = ? WHERE id = ?', [name, slug, image_url, id]);
  } else {
    await db.query('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
  }
};

const remove = async (id) => {
  await db.query('DELETE FROM categories WHERE id = ?', [id]);
};

module.exports = { findAll, findById, findBySlug, create, update, remove };
