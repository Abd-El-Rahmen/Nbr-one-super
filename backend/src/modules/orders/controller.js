const OrderService = require('./service');

const create = async (req, res, next) => {
  try {
    const data = await OrderService.createOrder(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const result = await OrderService.getAllOrders(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await OrderService.getOrderById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = await OrderService.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const track = async (req, res, next) => {
  try {
    const { id, phone } = req.query;
    if (!id || !phone) {
      return res.status(400).json({ success: false, error: 'رقم الطلب ورقم الهاتف مطلوبان' });
    }
    const data = await OrderService.trackOrder(id, phone);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getOne, updateStatus, track };
