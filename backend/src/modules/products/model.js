const db = require('../../config/db');

const findAll = async ({ limit, offset, category_id, search, is_active, is_offer, exclude_bundles }) => {
  let query = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (exclude_bundles === 'true' || exclude_bundles === true) {
    query += ' AND p.is_bundle = 0';
  }

  if (is_active !== undefined) {
    query += ' AND p.is_active = ?';
    params.push(is_active);
  }
  if (is_offer === true) {
    // A product is considered an offer if:
    // 1. It's a bundle (is_bundle = 1)
    // 2. It has a compare_at_price > base_price (classic promo/strikethrough)
    // 3. It has volume_offers with at least one entry
    // 4. Or it has a variant with a promo or volume offer
    query += ` AND (
      p.is_bundle = 1 OR
      (p.compare_at_price IS NOT NULL AND p.compare_at_price > p.base_price) OR
      (
        p.volume_offers IS NOT NULL AND
        p.volume_offers != '' AND
        p.volume_offers != 'null' AND
        CAST(p.volume_offers AS CHAR) NOT IN ('[]', 'null', '')
      ) OR
      EXISTS (
        SELECT 1 FROM product_variants v 
        WHERE v.product_id = p.id AND (
          (v.compare_at_price_override IS NOT NULL AND v.compare_at_price_override > v.price_override) OR
          (v.volume_offers IS NOT NULL AND v.volume_offers != '' AND v.volume_offers != 'null' AND CAST(v.volume_offers AS CHAR) NOT IN ('[]', 'null', ''))
        )
      )
    )`;
  }
  if (category_id === 'no_category') {
    // Products with no category assigned
    query += ' AND p.category_id IS NULL';
  } else if (category_id) {
    query += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows;
};

const countAll = async ({ category_id, search, is_active, is_offer, exclude_bundles }) => {
  let query = 'SELECT COUNT(*) AS total FROM products p WHERE 1=1';
  const params = [];

  if (exclude_bundles === 'true' || exclude_bundles === true) {
    query += ' AND p.is_bundle = 0';
  }

  if (is_active !== undefined) { query += ' AND p.is_active = ?'; params.push(is_active); }
  if (is_offer === true) {
    query += ` AND (
      p.is_bundle = 1 OR
      (p.compare_at_price IS NOT NULL AND p.compare_at_price > p.base_price) OR
      (p.volume_offers IS NOT NULL AND p.volume_offers != '' AND p.volume_offers != 'null' AND CAST(p.volume_offers AS CHAR) NOT IN ('[]', 'null', '')) OR
      EXISTS (
        SELECT 1 FROM product_variants v 
        WHERE v.product_id = p.id AND (
          (v.compare_at_price_override IS NOT NULL AND v.compare_at_price_override > v.price_override) OR
          (v.volume_offers IS NOT NULL AND v.volume_offers != '' AND v.volume_offers != 'null' AND CAST(v.volume_offers AS CHAR) NOT IN ('[]', 'null', ''))
        )
      )
    )`;
  }
  if (category_id === 'no_category') { query += ' AND p.category_id IS NULL'; }
  else if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
  if (search) { query += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const [[{ total }]] = await db.query(query, params);
  return total;
};

const findById = async (id) => {
  const [rows] = await db.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const findVariantsByProduct = async (product_id) => {
  const [rows] = await db.query(
    'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC',
    [product_id]
  );
  return rows;
};

const findVariantById = async (id) => {
  const [rows] = await db.query('SELECT * FROM product_variants WHERE id = ?', [id]);
  return rows[0] || null;
};

const create = async ({ name, description, category_id, base_price, compare_at_price, image_url, is_active, is_bundle, volume_offers }) => {
  const [result] = await db.query(
    'INSERT INTO products (name, description, category_id, base_price, compare_at_price, image_url, is_active, is_bundle, volume_offers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      name,
      description || null,
      category_id || null,
      base_price,
      compare_at_price || null,
      image_url || null,
      is_active ?? true,
      is_bundle ? 1 : 0,
      volume_offers ? JSON.stringify(volume_offers) : null,
    ]
  );
  return result.insertId;
};

// Whitelist of columns that can be updated — prevents SQL Injection via column name injection
const ALLOWED_PRODUCT_FIELDS = new Set([
  'name', 'description', 'category_id', 'base_price', 'compare_at_price',
  'image_url', 'is_active', 'is_bundle', 'volume_offers', 'stock_quantity',
]);

const update = async (id, fields) => {
  // Only allow known safe fields — prevent column-name SQL injection
  const filtered = Object.fromEntries(
    Object.entries(fields).filter(([k]) => ALLOWED_PRODUCT_FIELDS.has(k))
  );
  if (Object.keys(filtered).length === 0) return;

  // Normalize special fields before building the SET clause
  const normalized = { ...filtered };

  // If volume_offers is already a JSON string (from FormData), keep it as-is
  // If it's an array/object, stringify it
  if ('volume_offers' in normalized && normalized.volume_offers !== null && normalized.volume_offers !== undefined) {
    if (typeof normalized.volume_offers !== 'string') {
      normalized.volume_offers = JSON.stringify(normalized.volume_offers);
    }
    // If it's an empty string or 'null', set to NULL
    if (normalized.volume_offers === '' || normalized.volume_offers === 'null') {
      normalized.volume_offers = null;
    }
  }

  // Normalize is_bundle to 0/1
  if ('is_bundle' in normalized) {
    normalized.is_bundle = normalized.is_bundle === 'true' || normalized.is_bundle === true ? 1 : 0;
  }

  // Remove empty string compare_at_price (means removing the promo)
  if ('compare_at_price' in normalized && (normalized.compare_at_price === '' || normalized.compare_at_price === '0')) {
    normalized.compare_at_price = null;
  }

  const keys = Object.keys(normalized);
  const values = Object.values(normalized);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  await db.query(`UPDATE products SET ${setClause} WHERE id = ?`, [...values, id]);
};

const remove = async (id) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [id]);
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      // Soft delete: keep the product for order history but deactivate it
      await db.query('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
    } else {
      throw err;
    }
  }
};

const createVariant = async ({ product_id, name, sku, price_override, stock_quantity }) => {
  const [result] = await db.query(
    'INSERT INTO product_variants (product_id, name, sku, price_override, stock_quantity) VALUES (?, ?, ?, ?, ?)',
    [product_id, name, sku || null, price_override || null, stock_quantity ?? 0]
  );
  return result.insertId;
};

// Whitelist for variant columns
const ALLOWED_VARIANT_FIELDS = new Set([
  'name', 'sku', 'price_override', 'compare_at_price_override',
  'volume_offers', 'stock_quantity',
]);

const updateVariant = async (id, fields) => {
  // Only allow known safe fields — prevent column-name SQL injection
  const filtered = Object.fromEntries(
    Object.entries(fields).filter(([k]) => ALLOWED_VARIANT_FIELDS.has(k))
  );
  if (Object.keys(filtered).length === 0) return;

  const normalized = { ...filtered };

  // If volume_offers is already a JSON string (from FormData), keep it as-is
  // If it's an array/object, stringify it
  if ('volume_offers' in normalized && normalized.volume_offers !== null && normalized.volume_offers !== undefined) {
    if (typeof normalized.volume_offers !== 'string') {
      normalized.volume_offers = JSON.stringify(normalized.volume_offers);
    }
    // If it's an empty string or 'null', set to NULL
    if (normalized.volume_offers === '' || normalized.volume_offers === 'null') {
      normalized.volume_offers = null;
    }
  }

  // Remove empty string compare_at_price_override (means removing the promo)
  if ('compare_at_price_override' in normalized && (normalized.compare_at_price_override === '' || normalized.compare_at_price_override === '0')) {
    normalized.compare_at_price_override = null;
  }

  const keys = Object.keys(normalized);
  const values = Object.values(normalized);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  await db.query(`UPDATE product_variants SET ${setClause} WHERE id = ?`, [...values, id]);
};

const removeVariant = async (id) => {
  await db.query('DELETE FROM product_variants WHERE id = ?', [id]);
};

// ─── Bundle Items ──────────────────────────────────────────────────────────────
const findBundleItems = async (bundle_id) => {
  const [rows] = await db.query(
    `SELECT bi.*, p.name AS product_name, p.image_url AS product_image_url, p.base_price, pv.name AS variant_name, pv.price_override, pv.stock_quantity
     FROM bundle_items bi
     JOIN products p ON bi.product_id = p.id
     LEFT JOIN product_variants pv ON bi.variant_id = pv.id
     WHERE bi.bundle_id = ?`,
    [bundle_id]
  );
  return rows;
};

const addBundleItem = async ({ bundle_id, product_id, variant_id, quantity }) => {
  const [result] = await db.query(
    'INSERT INTO bundle_items (bundle_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
    [bundle_id, product_id, variant_id || null, quantity || 1]
  );
  return result.insertId;
};

const removeBundleItem = async (id) => {
  await db.query('DELETE FROM bundle_items WHERE id = ?', [id]);
};

const clearBundleItems = async (bundle_id) => {
  await db.query('DELETE FROM bundle_items WHERE bundle_id = ?', [bundle_id]);
};

module.exports = {
  findAll, countAll, findById, findVariantsByProduct, findVariantById,
  create, update, remove,
  createVariant, updateVariant, removeVariant,
  findBundleItems, addBundleItem, removeBundleItem, clearBundleItems,
};
