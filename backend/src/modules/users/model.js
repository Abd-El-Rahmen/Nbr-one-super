const db = require('../../config/db');

const findAll = async () => {
  const [rows] = await db.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

const create = async ({ name, email, password_hash, role }) => {
  const [result] = await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, role]
  );
  return result.insertId;
};

const update = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  await db.query(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
};

const remove = async (id) => {
  await db.query('DELETE FROM users WHERE id = ?', [id]);
};

module.exports = { findAll, findById, findByEmail, create, update, remove };
