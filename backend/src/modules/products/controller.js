const ProductService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const isAdmin = req.user !== undefined;
    const result = await ProductService.getAll(req.query, isAdmin);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const isAdmin = req.user !== undefined;
    const data = await ProductService.getById(req.params.id, isAdmin);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const imageUrl = req.file?.path || null;
    const data = await ProductService.create(req.body, imageUrl);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const imageUrl = req.file?.path || null;
    const data = await ProductService.update(req.params.id, req.body, imageUrl);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await ProductService.remove(req.params.id);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) { next(err); }
};

const createVariant = async (req, res, next) => {
  try {
    const data = await ProductService.createVariant(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const updateVariant = async (req, res, next) => {
  try {
    const data = await ProductService.updateVariant(req.params.variantId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const deleteVariant = async (req, res, next) => {
  try {
    await ProductService.deleteVariant(req.params.variantId);
    res.json({ success: true, message: 'Variant deleted.' });
  } catch (err) { next(err); }
};

const setBundleItems = async (req, res, next) => {
  try {
    const items = req.body.items || [];
    const data = await ProductService.clearAndSetBundleItems(req.params.id, items);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const deleteBundleItem = async (req, res, next) => {
  try {
    await ProductService.removeBundleItem(req.params.itemId);
    res.json({ success: true, message: 'Bundle item removed.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove, createVariant, updateVariant, deleteVariant, setBundleItems, deleteBundleItem };
