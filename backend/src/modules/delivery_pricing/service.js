const db = require('../../config/db');

const getAllPricing = async () => {
  const [rows] = await db.query('SELECT * FROM delivery_pricing ORDER BY CAST(tier_id AS UNSIGNED) ASC');
  return rows;
};

const updatePricing = async (tier_id, data) => {
  const { home_fee, stop_desk_fee } = data;
  await db.query(
    'UPDATE delivery_pricing SET home_fee = ?, stop_desk_fee = ? WHERE tier_id = ?',
    [home_fee, stop_desk_fee, tier_id]
  );
  const [rows] = await db.query('SELECT * FROM delivery_pricing WHERE tier_id = ?', [tier_id]);
  return rows[0];
};

module.exports = { getAllPricing, updatePricing };
