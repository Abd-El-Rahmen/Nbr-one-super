const db = require('../../config/db');

const findByEmail = async (email) => {
  const [rows] = await db.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

module.exports = { findByEmail, findById };
