const db = require('../../config/db');

const findAll = async ({ limit, offset, status }) => {
  let query = 'SELECT * FROM complaints WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await db.query(query, params);
  return rows;
};

const countAll = async ({ status }) => {
  let query = 'SELECT COUNT(*) AS total FROM complaints WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  const [[{ total }]] = await db.query(query, params);
  return total;
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM complaints WHERE id = ?', [id]);
  return rows[0] || null;
};

const create = async ({ customer_name, phone, message }) => {
  const [result] = await db.query(
    'INSERT INTO complaints (customer_name, phone, message) VALUES (?, ?, ?)',
    [customer_name || null, phone || null, message]
  );
  return result.insertId;
};

const updateStatus = async (id, status) => {
  await db.query('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
};

module.exports = { findAll, countAll, findById, create, updateStatus };
