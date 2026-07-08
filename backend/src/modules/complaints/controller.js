const ComplaintService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const result = await ComplaintService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await ComplaintService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await ComplaintService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = await ComplaintService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, updateStatus };
