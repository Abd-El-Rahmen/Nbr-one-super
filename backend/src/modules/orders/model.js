const db = require('../../config/db');

// ---- Customers ----

const createCustomer = async (conn, { full_name, phone, address_line, postal_code, wilaya, commune }) => {
  const [existing] = await conn.query('SELECT id FROM customers WHERE phone = ? LIMIT 1', [phone]);
  if (existing.length > 0) {
    await conn.query(
      'UPDATE customers SET full_name = ?, address_line = ?, postal_code = ?, wilaya = ?, commune = ? WHERE id = ?',
      [full_name, address_line || null, postal_code || null, wilaya || null, commune || null, existing[0].id]
    );
    return existing[0].id;
  }
  const [result] = await conn.query(
    'INSERT INTO customers (full_name, phone, address_line, postal_code, wilaya, commune) VALUES (?, ?, ?, ?, ?, ?)',
    [full_name, phone, address_line || null, postal_code || null, wilaya || null, commune || null]
  );
  return result.insertId;
};

const findHistoryByPhone = async (phone) => {
  const [rows] = await db.query(
    `SELECT o.id, o.total_price, o.status, o.created_at,
            (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as item_count
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE c.phone = ?
     ORDER BY o.created_at DESC`,
    [phone]
  );
  return rows;
};

// ---- Orders ----

const createOrder = async (conn, { customer_id, total_price, delivery_type, delivery_fee }) => {
  let orderId;
  let exists = true;

  while (exists) {
    // Generate a random 6-digit number (100000 - 999999)
    orderId = Math.floor(10000000 + Math.random() * 90000000);

    const [rows] = await conn.query(
      "SELECT 1 FROM orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    exists = rows.length > 0;
  }

  await conn.query(
    `INSERT INTO orders
      (id, customer_id, total_price, status, payment_method, delivery_type, delivery_fee)
     VALUES (?, ?, ?, 'pending', 'COD', ?, ?)`,
    [orderId, customer_id, total_price, delivery_type || 'home', delivery_fee || 0]
  );

  return orderId;
};

const createOrderItem = async (conn, { order_id, product_id, variant_id, quantity, price_at_purchase }) => {
  await conn.query(
    'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)',
    [order_id, product_id, variant_id || null, quantity, price_at_purchase]
  );
};

// ---- Stock ----

const getVariantStock = async (conn, variant_id) => {
  const [rows] = await conn.query(
    'SELECT stock_quantity FROM product_variants WHERE id = ? FOR UPDATE',
    [variant_id]
  );
  return rows[0] || null;
};

const getProductById = async (conn, product_id) => {
  const [rows] = await conn.query(
    'SELECT id, name, base_price, is_active FROM products WHERE id = ? FOR UPDATE',
    [product_id]
  );
  return rows[0] || null;
};

const getVariantById = async (conn, variant_id) => {
  const [rows] = await conn.query(
    'SELECT id, product_id, price_override, stock_quantity FROM product_variants WHERE id = ? FOR UPDATE',
    [variant_id]
  );
  return rows[0] || null;
};

const deductStock = async (conn, variant_id, quantity) => {
  if (quantity > 0) {
    const [result] = await conn.query(
      'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
      [quantity, variant_id, quantity]
    );
    if (result.affectedRows === 0) {
      throw new Error(`Insufficient stock for variant ID ${variant_id}`);
    }
  } else {
    // For returns (quantity < 0), just add it back
    await conn.query(
      'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [quantity, variant_id]
    );
  }
};

const deductProductStock = async (conn, product_id, quantity) => {
  if (quantity > 0) {
    const [result] = await conn.query(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
      [quantity, product_id, quantity]
    );
    if (result.affectedRows === 0) {
      throw new Error(`Insufficient stock for product ID ${product_id}`);
    }
  } else {
    // For returns
    await conn.query(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [quantity, product_id]
    );
  }
};

// ---- Inventory log ----

const createInventoryLog = async (conn, { variant_id, product_id, change_amount, reason }) => {
  if (variant_id) {
    await conn.query(
      'INSERT INTO inventory_logs (variant_id, change_amount, reason) VALUES (?, ?, ?)',
      [variant_id, change_amount, reason]
    );
  } else if (product_id) {
    await conn.query(
      'INSERT INTO inventory_logs (product_id, change_amount, reason) VALUES (?, ?, ?)',
      [product_id, change_amount, reason]
    );
  }
};

// ---- Read orders ----

const findAll = async ({ limit, offset, status, startDate, endDate }) => {
  let query = `
    SELECT o.*, c.full_name, c.phone, c.address_line, c.postal_code, c.wilaya, c.commune
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND o.status = ?'; params.push(status); }
  if (startDate) { query += ' AND DATE(o.created_at) >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND DATE(o.created_at) <= ?'; params.push(endDate); }
  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows;
};

const countAll = async ({ status, startDate, endDate }) => {
  let query = 'SELECT COUNT(*) AS total FROM orders WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (startDate) { query += ' AND DATE(created_at) >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND DATE(created_at) <= ?'; params.push(endDate); }
  const [[{ total }]] = await db.query(query, params);
  return total;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT o.*, c.full_name, c.phone, c.address_line, c.postal_code, c.wilaya, c.commune
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const findOrderItems = async (order_id) => {
  const [rows] = await db.query(
    `SELECT oi.*, p.name AS product_name, pv.name AS variant_name
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     LEFT JOIN product_variants pv ON oi.variant_id = pv.id
     WHERE oi.order_id = ?`,
    [order_id]
  );
  return rows;
};

const updateStatus = async (id, status) => {
  await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
};

module.exports = {
  createCustomer, createOrder, createOrderItem,
  getProductById, getVariantById, getVariantStock, deductStock, deductProductStock,
  createInventoryLog,
  findAll, countAll, findById, findOrderItems, updateStatus,
  findHistoryByPhone
};
