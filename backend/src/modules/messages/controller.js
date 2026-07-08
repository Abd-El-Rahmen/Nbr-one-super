const MessageService = require('./service');

const getAll = async (req, res, next) => {
  try {
    if (req.query.order_id) {
      const data = await MessageService.getByOrderId(req.query.order_id);
      return res.json({ success: true, data });
    }
    const result = await MessageService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await MessageService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getAll, create };
