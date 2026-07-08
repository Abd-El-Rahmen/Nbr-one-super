const CategoryService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const data = await CategoryService.getAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const data = await CategoryService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await CategoryService.create(req.body, req.file?.path);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await CategoryService.update(req.params.id, req.body, req.file?.path);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await CategoryService.remove(req.params.id);
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove };
