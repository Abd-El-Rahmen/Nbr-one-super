const CustomerService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const result = await CustomerService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await CustomerService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne };
