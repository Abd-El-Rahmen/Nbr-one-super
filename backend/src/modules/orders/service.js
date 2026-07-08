const db = require('../../config/db');
const OrderModel = require('./model');
const AppError = require('../../utils/AppError');
const { getPagination, paginate } = require('../../utils/pagination.helper');

/**
 * VALID STATUS TRANSITIONS
 * pending → confirmed | rejected
 * confirmed → delivered | failed
 */
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['shipped', 'delivered', 'failed'],
  shipped: ['delivered', 'failed'],
  rejected: [],
  delivered: [],
  failed: [],
};

/**
 * Create a guest order within a single DB transaction.
 * Steps:
 *  1. Create customer record
 *  2. Validate all items (product exists, active, variant belongs to product, stock available)
 *  3. Compute total price from DB prices (NEVER trust frontend)
 *  4. Create order
 *  5. For each item: create order_item, deduct stock, insert inventory_log
 */
const createOrder = async ({ customer: customerData, items, delivery_type, delivery_fee }) => {
  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // 0. Guard against oversized orders
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('الطلب يجب أن يحتوي على منتج واحد على الأقل.', 400);
    }
    if (items.length > 50) {
      throw new AppError('لا يمكن أن يحتوي الطلب على أكثر من 50 نوع منتج.', 400);
    }

    // 1. Create customer
    const customer_id = await OrderModel.createCustomer(conn, customerData);

    // 2 & 3. Validate items and compute total
    let total_price = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await OrderModel.getProductById(conn, item.product_id);

      if (!product) {
        throw new AppError(`المنتج رقم ${item.product_id} غير موجود.`, 404);
      }
      if (!product.is_active) {
        throw new AppError(`المنتج "${product.name}" لم يعد متوفراً. يرجى إزالته من السلة.`, 400);
      }

      let price_at_purchase = parseFloat(product.base_price);
      let variant = null;

      // ── Bundle: check all component variants have enough stock ──
      const [[productFull]] = await conn.query('SELECT is_bundle FROM products WHERE id = ?', [item.product_id]);
      if (productFull?.is_bundle) {
        const [bundleItems] = await conn.query(
          'SELECT bi.variant_id, bi.quantity, pv.stock_quantity, p.name AS product_name, pv.name AS variant_name FROM bundle_items bi JOIN product_variants pv ON bi.variant_id = pv.id JOIN products p ON pv.product_id = p.id WHERE bi.bundle_id = ? AND bi.variant_id IS NOT NULL',
          [item.product_id]
        );
        for (const bi of bundleItems) {
          const needed = bi.quantity * item.quantity;
          if (bi.stock_quantity < needed) {
            throw new AppError(
              `الكمية غير كافية في الباقة: "${bi.product_name} - ${bi.variant_name}". المتاح: ${bi.stock_quantity}، المطلوب: ${needed}.`,
              400
            );
          }
        }
      }

      if (item.variant_id) {
        variant = await OrderModel.getVariantById(conn, item.variant_id);

        if (!variant) {
          throw new AppError(`خيار المنتج المطلوب غير موجود. يرجى مراجعة السلة.`, 404);
        }
        if (variant.product_id !== item.product_id) {
          throw new AppError(
            `خطأ في بيانات المنتج. يرجى تفريغ السلة وإعادة الإضافة.`,
            400
          );
        }
        if (variant.stock_quantity < item.quantity) {
          throw new AppError(
            `الكمية غير كافية لـ "${product.name}". المتاح: ${variant.stock_quantity}، المطلوب: ${item.quantity}.`,
            400
          );
        }

        // Use variant price if available, fall back to base_price
        if (variant.price_override !== null) {
          price_at_purchase = parseFloat(variant.price_override);
        }
      } else if (!productFull?.is_bundle) {
        // Fetch the product stock to check
        const [productStockRow] = await conn.query('SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
        if (productStockRow[0] && productStockRow[0].stock_quantity < item.quantity) {
          throw new AppError(
            `الكمية غير كافية لـ "${product.name}". المتاح: ${productStockRow[0].stock_quantity}، المطلوب: ${item.quantity}.`,
            400
          );
        }
      }

      // Check for Volume Offers (عروض الكمية)
      let vo = [];
      if (variant && variant.volume_offers) {
        vo = variant.volume_offers;
      } else if (product.volume_offers) {
        vo = product.volume_offers;
      }
      
      if (typeof vo === 'string') { try { vo = JSON.parse(vo); } catch { vo = []; } }
      if (Array.isArray(vo) && vo.length > 0) {
        // Sort by highest quantity first, find an offer where requested quantity is a multiple of the offer pack size
        const sortedOffers = [...vo].sort((a, b) => parseInt(b.quantity) - parseInt(a.quantity));
        const matchingOffer = sortedOffers.find(o => item.quantity % parseInt(o.quantity) === 0);
        
        if (matchingOffer) {
          // price_at_purchase is PER UNIT, calculated from the pack price
          price_at_purchase = parseFloat(matchingOffer.price) / parseInt(matchingOffer.quantity);
        }
      }

      total_price += price_at_purchase * item.quantity;
      validatedItems.push({ ...item, price_at_purchase, variant });
    }

    total_price = parseFloat(total_price.toFixed(2));

    // 4. Calculate Delivery Fee securely from DB
    let actual_delivery_fee = 0;
    if (customerData.wilaya_code) {
      const [[tier]] = await conn.query('SELECT home_fee, stop_desk_fee FROM delivery_pricing WHERE tier_id = ?', [customerData.wilaya_code]);
      if (tier) {
        actual_delivery_fee = delivery_type === 'home' ? Number(tier.home_fee) : Number(tier.stop_desk_fee);
      }
    }
    
    total_price += actual_delivery_fee;

    const order_id = await OrderModel.createOrder(conn, { 
      customer_id, 
      total_price, 
      delivery_type, 
      delivery_fee: actual_delivery_fee 
    });

    // 5. Create items, deduct stock, log
    for (const item of validatedItems) {
      await OrderModel.createOrderItem(conn, {
        order_id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      });

      // Stock deduction is now delayed until the order is shipped.
    }

    await conn.commit();

    return getOrderById(order_id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const getAllOrders = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const filters = { status: query.status, startDate: query.startDate, endDate: query.endDate };

  const [orders, total] = await Promise.all([
    OrderModel.findAll({ limit, offset, ...filters }),
    OrderModel.countAll(filters),
  ]);

  return paginate(orders, total, page, limit);
};

const getOrderById = async (id) => {
  const order = await OrderModel.findById(id);
  if (!order) throw new AppError('Order not found.', 404);

  const items = await OrderModel.findOrderItems(id);
  const history = await OrderModel.findHistoryByPhone(order.phone);
  
  return { ...order, items, history };
};

const updateOrderStatus = async (id, newStatus) => {
  const order = await OrderModel.findById(id);
  if (!order) throw new AppError('Order not found.', 404);

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition order from "${order.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}.`,
      400
    );
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, id]);

    // 1) If moving to confirmed/preparation (deduct stock)
    if (newStatus === 'confirmed' && order.status === 'pending') {
      const items = await OrderModel.findOrderItems(id);
      for (const item of items) {
        // Check if this product is a bundle
        const [[productRow]] = await conn.query('SELECT is_bundle FROM products WHERE id = ?', [item.product_id]);
        if (productRow?.is_bundle) {
          // Deduct stock from all bundle component variants
          const [bundleItems] = await conn.query(
            'SELECT variant_id, quantity FROM bundle_items WHERE bundle_id = ? AND variant_id IS NOT NULL',
            [item.product_id]
          );
          for (const bi of bundleItems) {
            const totalQty = bi.quantity * item.quantity;
            await OrderModel.deductStock(conn, bi.variant_id, totalQty);
            await OrderModel.createInventoryLog(conn, {
              variant_id: bi.variant_id,
              change_amount: -totalQty,
              reason: 'bundle_order_confirmed',
            });
          }
        } else if (item.variant_id) {
          await OrderModel.deductStock(conn, item.variant_id, item.quantity);
          await OrderModel.createInventoryLog(conn, {
            variant_id: item.variant_id,
            change_amount: -item.quantity,
            reason: 'order_confirmed',
          });
        } else {
          await OrderModel.deductProductStock(conn, item.product_id, item.quantity);
          await OrderModel.createInventoryLog(conn, {
            product_id: item.product_id,
            change_amount: -item.quantity,
            reason: 'order_confirmed',
          });
        }
      }
    }

    // 2) If moving to failed from confirmed or shipped (restock/return)
    if (newStatus === 'failed' && ['confirmed', 'shipped'].includes(order.status)) {
      const items = await OrderModel.findOrderItems(id);
      for (const item of items) {
        // Check if this product is a bundle
        const [[productRow]] = await conn.query('SELECT is_bundle FROM products WHERE id = ?', [item.product_id]);
        if (productRow?.is_bundle) {
          // Restore stock for all bundle component variants
          const [bundleItems] = await conn.query(
            'SELECT variant_id, quantity FROM bundle_items WHERE bundle_id = ? AND variant_id IS NOT NULL',
            [item.product_id]
          );
          for (const bi of bundleItems) {
            const totalQty = bi.quantity * item.quantity;
            await OrderModel.deductStock(conn, bi.variant_id, -totalQty); // negative = add back
            await OrderModel.createInventoryLog(conn, {
              variant_id: bi.variant_id,
              change_amount: totalQty,
              reason: 'bundle_order_returned',
            });
          }
        } else if (item.variant_id) {
          // Restore stock for regular product variant
          await OrderModel.deductStock(conn, item.variant_id, -item.quantity);
          await OrderModel.createInventoryLog(conn, {
            variant_id: item.variant_id,
            change_amount: item.quantity,
            reason: 'order_returned',
          });
        } else {
          // Restore stock for regular product
          await OrderModel.deductProductStock(conn, item.product_id, -item.quantity);
          await OrderModel.createInventoryLog(conn, {
            product_id: item.product_id,
            change_amount: item.quantity,
            reason: 'order_returned',
          });
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getOrderById(id);
};

const trackOrder = async (id, phone) => {
  const order = await OrderModel.findById(id);
  if (!order) throw new AppError('لم يتم العثور على الطلب.', 404);

  // Security: ensure phone matches so clients can only see their own orders
  const normalizedInput = phone.replace(/\s+/g, '');
  const normalizedStored = (order.phone || '').replace(/\s+/g, '');
  if (normalizedInput !== normalizedStored) {
    throw new AppError(' . يرجى التحقق من المعلومات المدخلة.', 403);
  }

  const items = await OrderModel.findOrderItems(id);
  return { ...order, items };
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus, trackOrder };

