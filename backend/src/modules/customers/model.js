const db = require('../../config/db');

const findAll = async ({ limit, offset, search }) => {
  let query = `
    SELECT 
      MAX(id) as id,
      phone, 
      GROUP_CONCAT(DISTINCT full_name SEPARATOR ' • ') as full_name,
      GROUP_CONCAT(DISTINCT address_line SEPARATOR ' • ') as address_line,
      MAX(postal_code) as postal_code,
      MAX(created_at) as created_at
    FROM customers WHERE 1=1
  `;
  const params = [];
  if (search) {
    query += ' AND (full_name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' GROUP BY phone ORDER BY MAX(created_at) DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await db.query(query, params);
  return rows;
};

const countAll = async ({ search }) => {
  let query = 'SELECT COUNT(DISTINCT phone) AS total FROM customers WHERE 1=1';
  const params = [];
  if (search) { query += ' AND (full_name LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const [[{ total }]] = await db.query(query, params);
  return total;
};

const findById = async (id) => {
  const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
  return rows[0] || null;
};

const findOrdersByCustomer = async (id) => {
  const [rows] = await db.query(
    `SELECT o.* FROM orders o
     JOIN customers c1 ON o.customer_id = c1.id
     JOIN customers c2 ON c1.phone = c2.phone
     WHERE c2.id = ?
     ORDER BY o.created_at DESC`,
    [id]
  );
  return rows;
};

module.exports = { findAll, countAll, findById, findOrdersByCustomer };
