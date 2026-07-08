const db = require('../../config/db');

const findLogs = async ({ limit, offset, variant_id, reason }) => {
  let query = `
    SELECT il.*, pv.name AS variant_name, p.name AS product_name
    FROM inventory_logs il
    JOIN product_variants pv ON il.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (variant_id) { query += ' AND il.variant_id = ?'; params.push(variant_id); }
  if (reason) { query += ' AND il.reason = ?'; params.push(reason); }
  query += ' ORDER BY il.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows;
};

const countLogs = async ({ variant_id, reason }) => {
  let query = 'SELECT COUNT(*) AS total FROM inventory_logs WHERE 1=1';
  const params = [];
  if (variant_id) { query += ' AND variant_id = ?'; params.push(variant_id); }
  if (reason) { query += ' AND reason = ?'; params.push(reason); }
  const [[{ total }]] = await db.query(query, params);
  return total;
};

const findVariantById = async (id) => {
  const [rows] = await db.query('SELECT * FROM product_variants WHERE id = ?', [id]);
  return rows[0] || null;
};

const addStock = async (variant_id, quantity) => {
  await db.query(
    'UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?',
    [quantity, variant_id]
  );
};

const logRestock = async ({ variant_id, change_amount, reason }) => {
  const [result] = await db.query(
    'INSERT INTO inventory_logs (variant_id, change_amount, reason) VALUES (?, ?, ?)',
    [variant_id, change_amount, reason]
  );
  return result.insertId;
};

module.exports = { findLogs, countLogs, findVariantById, addStock, logRestock };
