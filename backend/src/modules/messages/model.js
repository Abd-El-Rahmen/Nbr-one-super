const db = require('../../config/db');

const findByOrderId = async (order_id) => {
  const [rows] = await db.query(
    'SELECT * FROM messages WHERE order_id = ? ORDER BY created_at ASC',
    [order_id]
  );
  return rows;
};

const findAll = async ({ limit, offset }) => {
  const [rows] = await db.query(
    'SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows;
};

const create = async ({ order_id, sender_type, message }) => {
  const [result] = await db.query(
    'INSERT INTO messages (order_id, sender_type, message) VALUES (?, ?, ?)',
    [order_id || null, sender_type, message]
  );
  return result.insertId;
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM messages WHERE id = ?', [id]);
  return rows[0] || null;
};

const countAll = async () => {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM messages');
  return total;
};

module.exports = { findByOrderId, findAll, countAll, create, findById };
