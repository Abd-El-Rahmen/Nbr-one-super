const db = require('../../config/db');

const getStats = async () => {
  // Total orders & revenue
  const [[orderStats]] = await db.query(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(total_price), 0) AS total_revenue,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_orders,
      SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped_orders,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_orders,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_orders
    FROM orders
  `);

  // Total customers
  const [[{ total_customers }]] = await db.query(
    'SELECT COUNT(*) AS total_customers FROM customers'
  );

  // Total products
  const [[{ total_products, active_products }]] = await db.query(`
    SELECT
      COUNT(*) AS total_products,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_products
    FROM products
  `);

  // Top 5 products by quantity sold
  const [top_products] = await db.query(`
    SELECT
      p.id,
      p.name,
      p.image_url,
      SUM(oi.quantity) AS total_sold,
      SUM(oi.quantity * oi.price_at_purchase) AS total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status NOT IN ('rejected', 'failed')
    GROUP BY p.id, p.name, p.image_url
    ORDER BY total_sold DESC
    LIMIT 5
  `);

  // Revenue last 7 days
  const [daily_revenue] = await db.query(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*) AS orders_count,
      SUM(total_price) AS revenue
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      AND status NOT IN ('rejected', 'failed')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  // Open complaints count
  const [[{ open_complaints }]] = await db.query(
    "SELECT COUNT(*) AS open_complaints FROM complaints WHERE status = 'open'"
  );

  // Total messages count
  const [[{ total_messages }]] = await db.query(
    'SELECT COUNT(*) AS total_messages FROM messages'
  );

  // Low stock variants (stock < 5)
  const [low_stock] = await db.query(`
    SELECT pv.id, pv.name AS variant_name, pv.stock_quantity, p.name AS product_name
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.stock_quantity < 5 AND pv.stock_quantity > 0
    ORDER BY pv.stock_quantity ASC
    LIMIT 10
  `);

  const [[{ low_stock_count }]] = await db.query(`
    SELECT COUNT(*) AS low_stock_count
    FROM product_variants
    WHERE stock_quantity < 5 AND stock_quantity > 0
  `);

  // Out of stock variants (stock = 0)
  const [[{ out_of_stock_count }]] = await db.query(`
    SELECT COUNT(*) AS out_of_stock_count
    FROM product_variants
    WHERE stock_quantity = 0
  `);

  // Today vs Yesterday
  const [[todayStats]] = await db.query(`
    SELECT
      COUNT(*) AS orders,
      COALESCE(SUM(total_price), 0) AS revenue
    FROM orders
    WHERE DATE(created_at) = CURDATE()
  `);

  const [[yesterdayStats]] = await db.query(`
    SELECT
      COUNT(*) AS orders,
      COALESCE(SUM(total_price), 0) AS revenue
    FROM orders
    WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  `);

  return {
    orders: {
      total: parseInt(orderStats.total_orders) || 0,
      pending: parseInt(orderStats.pending_orders) || 0,
      confirmed: parseInt(orderStats.confirmed_orders) || 0,
      shipped: parseInt(orderStats.shipped_orders) || 0,
      delivered: parseInt(orderStats.delivered_orders) || 0,
      rejected: parseInt(orderStats.rejected_orders) || 0,
      failed: parseInt(orderStats.failed_orders) || 0,
      today: parseInt(todayStats.orders) || 0,
      yesterday: parseInt(yesterdayStats.orders) || 0,
    },
    revenue: {
      total: parseFloat(orderStats.total_revenue),
      daily: daily_revenue,
      today: parseFloat(todayStats.revenue),
      yesterday: parseFloat(yesterdayStats.revenue),
    },
    customers: {
      total: total_customers,
    },
    products: {
      total: total_products,
      active: active_products,
    },
    top_products,
    low_stock,
    low_stock_count,
    out_of_stock_count,
    complaints: {
      open: open_complaints,
    },
    messages: {
      total: total_messages,
    },
  };
};

const getAnalyticsData = async (query) => {
  const { start_date, end_date } = query || {};
  let dateFilter = '';
  let params = [];

  let dateFormat = "'%Y-%m-%d'"; // Default to daily
  
  if (start_date && end_date) {
    dateFilter = 'AND created_at >= ? AND created_at <= ?';
    params.push(start_date, end_date + ' 23:59:59');
    
    const diffDays = (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24);
    if (diffDays <= 2) {
      dateFormat = "'%Y-%m-%d %H:00'"; // Group by hour
    } else if (diffDays <= 60) {
      dateFormat = "'%Y-%m-%d'"; // Group by day
    } else {
      dateFormat = "'%Y-%m'"; // Group by month
    }
  } else {
    // Default to last 12 months if no dates provided
    dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
    dateFormat = "'%Y-%m'";
  }

  // Earnings Chart (Dynamic Grouping)
  const [earnings_chart] = await db.query(`
    SELECT
      DATE_FORMAT(created_at, ${dateFormat}) AS label,
      SUM(total_price) AS revenue,
      COUNT(*) AS orders_count
    FROM orders
    WHERE status NOT IN ('rejected', 'failed')
      ${dateFilter}
    GROUP BY label
    ORDER BY label ASC
  `, params);

  // Category Distribution (Revenue by Category)
  const [category_distribution_raw] = await db.query(`
    SELECT
      COALESCE(c.name, 'بدون قسم') AS name,
      SUM(oi.quantity * oi.price_at_purchase) AS value,
      COUNT(DISTINCT oi.order_id) AS order_count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status NOT IN ('rejected', 'failed')
      ${dateFilter.replace(/created_at/g, 'o.created_at')}
    GROUP BY c.id, c.name
  `, params);

  // If no revenue data, fall back to order_count
  const hasRevenue = category_distribution_raw.some(r => parseFloat(r.value) > 0);
  const category_distribution = category_distribution_raw.map(r => ({
    name: r.name,
    value: hasRevenue ? (parseFloat(r.value) || 0) : (parseInt(r.order_count) || 0),
    _type: hasRevenue ? 'revenue' : 'count',
  }));

  // Order Status Distribution
  const [order_status_distribution] = await db.query(`
    SELECT
      status AS name,
      COUNT(*) AS value
    FROM orders
    WHERE 1=1 ${dateFilter.replace(/AND/, 'AND')}
    GROUP BY status
  `, params);

  // Top Customers by amount spent
  const [top_customers] = await db.query(`
    SELECT
      c.id,
      c.full_name,
      c.phone,
      COUNT(o.id) AS total_orders,
      SUM(o.total_price) AS total_spent
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    WHERE o.status NOT IN ('rejected', 'failed')
      ${dateFilter.replace(/created_at/g, 'o.created_at')}
    GROUP BY c.id
    ORDER BY total_spent DESC
    LIMIT 5
  `, params);

  // All selling products ranked by sales
  const [top_products] = await db.query(`
    SELECT
      p.id, p.name, p.image_url,
      SUM(oi.quantity) AS total_sold,
      SUM(oi.quantity * oi.price_at_purchase) AS total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status NOT IN ('rejected', 'failed')
      ${dateFilter.replace(/created_at/g, 'o.created_at')}
    GROUP BY p.id, p.name, p.image_url
    ORDER BY total_sold DESC
  `, params);

  // Slow-moving products: active products with low/no sales in the period
  const [slow_products] = await db.query(`
    SELECT
      p.id, p.name, p.image_url,
      COALESCE(SUM(oi.quantity), 0) AS total_sold,
      COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) AS total_revenue,
      MAX(pv.stock_quantity) AS stock_available
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
      AND oi.order_id IN (
        SELECT o2.id FROM orders o2
        WHERE o2.status NOT IN ('rejected', 'failed')
        ${dateFilter.replace(/AND created_at/g, 'AND o2.created_at').replace(/AND o\.created_at/g, 'AND o2.created_at')}
      )
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id, p.name, p.image_url
    HAVING total_sold < 5
    ORDER BY total_sold ASC, stock_available DESC
    LIMIT 10
  `, params);

  // KPI Summary
  const [[kpi]] = await db.query(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(total_price), 0) AS total_revenue,
      COALESCE(AVG(total_price), 0) AS avg_order_value,
      COUNT(DISTINCT customer_id) AS unique_customers
    FROM orders
    WHERE status NOT IN ('rejected', 'failed')
      ${dateFilter}
  `, params);

  // New customers registered in period
  const [[{ new_customers }]] = await db.query(`
    SELECT COUNT(*) AS new_customers FROM customers
    WHERE 1=1 ${dateFilter.replace(/created_at/g, 'created_at')}
  `, params);

  // Conversion: cancelled/failed ratio
  const [[cancellation]] = await db.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status IN ('rejected','failed') THEN 1 ELSE 0 END) AS cancelled
    FROM orders
    WHERE 1=1 ${dateFilter}
  `, params);

  return {
    earnings_chart: earnings_chart.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue) || 0,
      orders_count: parseInt(r.orders_count) || 0,
    })),
    category_distribution: category_distribution
      .map(r => ({ name: r.name, value: parseFloat(r.value) || 0 }))
      .filter(r => r.value > 0),
    order_status_distribution: order_status_distribution.map(r => ({
      name: r.name,
      value: parseInt(r.value) || 0,
    })),
    top_customers,
    top_products: top_products.map(r => ({
      ...r,
      total_sold: parseInt(r.total_sold) || 0,
      total_revenue: parseFloat(r.total_revenue) || 0,
    })),
    slow_products: slow_products.map(r => ({
      ...r,
      total_sold: parseInt(r.total_sold) || 0,
      total_revenue: parseFloat(r.total_revenue) || 0,
      stock_available: parseInt(r.stock_available) || 0,
    })),
    kpi: {
      total_orders: parseInt(kpi.total_orders) || 0,
      total_revenue: parseFloat(kpi.total_revenue) || 0,
      avg_order_value: parseFloat(kpi.avg_order_value) || 0,
      unique_customers: parseInt(kpi.unique_customers) || 0,
      new_customers: parseInt(new_customers) || 0,
      cancellation_rate: cancellation.total > 0 ? Math.round((cancellation.cancelled / cancellation.total) * 100) : 0,
    }
  };
};

module.exports = { getStats, getAnalyticsData };
