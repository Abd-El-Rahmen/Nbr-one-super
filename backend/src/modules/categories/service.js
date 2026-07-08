const CategoryModel = require('./model');
const AppError = require('../../utils/AppError');

const slugify = (name) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const getAll = async () => CategoryModel.findAll();

const getById = async (id) => {
  const cat = await CategoryModel.findById(id);
  if (!cat) throw new AppError('Category not found.', 404);
  return cat;
};

const create = async (data, imageUrl) => {
  const { name } = data;
  const finalSlug =  slugify(name);
  const existing = await CategoryModel.findBySlug(finalSlug);
  if (existing) throw new AppError('A category with this slug already exists.', 409);

  const payload = { name, slug: finalSlug };
  if (imageUrl) payload.image_url = imageUrl;

  const id = await CategoryModel.create(payload);
  return CategoryModel.findById(id);
};

const update = async (id, data, imageUrl) => {
  const { name, slug } = data;
  await getById(id);
  const finalSlug = slug || slugify(name);

  const existing = await CategoryModel.findBySlug(finalSlug);
  if (existing && existing.id !== parseInt(id)) {
    throw new AppError('A category with this slug already exists.', 409);
  }

  const payload = { name, slug: finalSlug };
  if (imageUrl) payload.image_url = imageUrl;
  // If the user deliberately clears the image, we might need a way to clear it.
  // But usually FormData won't send an empty image unless handled specifically.
  
  await CategoryModel.update(id, payload);
  return CategoryModel.findById(id);
};

const remove = async (id) => {
  await getById(id);
  await CategoryModel.remove(id);
};

module.exports = { getAll, getById, create, update, remove };
