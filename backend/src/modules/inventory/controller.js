const InventoryService = require('./service');

const getLogs = async (req, res, next) => {
  try {
    const result = await InventoryService.getLogs(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const restock = async (req, res, next) => {
  try {
    const data = await InventoryService.restock(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const bulkRestock = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items array is required' });
    }
    await InventoryService.bulkRestock(items);
    res.status(201).json({ success: true, message: 'Bulk restock completed' });
  } catch (err) { next(err); }
};

module.exports = { getLogs, restock, bulkRestock };
