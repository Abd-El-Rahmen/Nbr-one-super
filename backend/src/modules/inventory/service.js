const InventoryModel = require('./model');
const AppError = require('../../utils/AppError');
const { getPagination, paginate } = require('../../utils/pagination.helper');

const getLogs = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const filters = { variant_id: query.variant_id, reason: query.reason };

  const [logs, total] = await Promise.all([
    InventoryModel.findLogs({ limit, offset, ...filters }),
    InventoryModel.countLogs(filters),
  ]);

  return paginate(logs, total, page, limit);
};

const restock = async ({ variant_id, quantity, reason }) => {
  const variant = await InventoryModel.findVariantById(variant_id);
  if (!variant) throw new AppError('Variant not found.', 404);

  await InventoryModel.addStock(variant_id, quantity);
  await InventoryModel.logRestock({ variant_id, change_amount: quantity, reason });

  return InventoryModel.findVariantById(variant_id);
};

const bulkRestock = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('يجب توفير قائمة بعناصر إعادة التخزين.', 400);
  }
  if (items.length > 100) {
    throw new AppError('لا يمكن معالجة أكثر من 100 عنصر في طلب واحد.', 400);
  }

  const db = require('../../config/db');
  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    for (const item of items) {
      const { variant_id, quantity, note } = item;

      if (!variant_id || !Number.isInteger(Number(variant_id)) || Number(variant_id) <= 0) {
        throw new AppError(`variant_id غير صالح: ${variant_id}`, 400);
      }
      if (!quantity || Number(quantity) <= 0) {
        throw new AppError(`الكمية يجب أن تكون أكبر من 0 للمنتج ${variant_id}`, 400);
      }

      // Verify variant exists
      const [[variantRow]] = await conn.query('SELECT id FROM product_variants WHERE id = ?', [variant_id]);
      if (!variantRow) {
        throw new AppError(`المتغير رقم ${variant_id} غير موجود في قاعدة البيانات.`, 404);
      }

      await conn.query('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?', [quantity, variant_id]);
      await conn.query('INSERT INTO inventory_logs (variant_id, change_amount, reason) VALUES (?, ?, ?)', [variant_id, quantity, note || 'restock']);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { getLogs, restock, bulkRestock };
