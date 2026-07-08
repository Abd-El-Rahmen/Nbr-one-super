const ProductModel = require('./model');
const AppError = require('../../utils/AppError');
const { getPagination, paginate } = require('../../utils/pagination.helper');

const getAll = async (query, isAdmin = false) => {
  const { page, limit, offset } = getPagination(query);
  const isOffer = query.is_offer === 'true' || query.is_offer === true;
  const filters = {
    category_id: query.category_id,
    search: query.search,
    is_active: isAdmin 
      ? (query.is_active !== undefined ? String(query.is_active) === 'true' : undefined) 
      : true,
    ...(isOffer ? { is_offer: true } : {}), // only add filter if explicitly requested
    exclude_bundles: query.exclude_bundles,
  };

  const [products, total] = await Promise.all([
    ProductModel.findAll({ limit, offset, ...filters }),
    ProductModel.countAll(filters),
  ]);

  // Attach variants and bundle_items
  const productsWithExtras = await Promise.all(
    products.map(async (p) => {
      const variants = await ProductModel.findVariantsByProduct(p.id);
      let bundle_items = [];
      if (p.is_bundle) {
        bundle_items = await ProductModel.findBundleItems(p.id);
      }
      return { ...p, variants, bundle_items };
    })
  );

  return paginate(productsWithExtras, total, page, limit);
};

const getById = async (id, isAdmin = false) => {
  const product = await ProductModel.findById(id);
  if (!product) throw new AppError('Product not found.', 404);
  if (!isAdmin && !product.is_active) throw new AppError('Product not found.', 404);

  const variants = await ProductModel.findVariantsByProduct(id);
  // Parse volume_offers JSON if stored as string
  let volume_offers = product.volume_offers;
  if (typeof volume_offers === 'string') {
    try { volume_offers = JSON.parse(volume_offers); } catch { volume_offers = []; }
  }
  // Attach bundle items if this is a bundle
  let bundle_items = [];
  if (product.is_bundle) {
    bundle_items = await ProductModel.findBundleItems(id);
  }
  return { ...product, variants, volume_offers: volume_offers || [], bundle_items };
};

const create = async (data, imageUrl) => {
  if (imageUrl) data.image_url = imageUrl;
  const id = await ProductModel.create(data);
  return getById(id, true);
};

const update = async (id, data, imageUrl) => {
  await getById(id, true);
  if (imageUrl) data.image_url = imageUrl;
  await ProductModel.update(id, data);
  return getById(id, true);
};

const remove = async (id) => {
  await getById(id, true);
  await ProductModel.remove(id);
};

// --- Variants ---

const createVariant = async (product_id, variantData) => {
  await getById(product_id, true);
  const id = await ProductModel.createVariant({ product_id, ...variantData });
  return ProductModel.findVariantById(id);
};

const updateVariant = async (variantId, data) => {
  const variant = await ProductModel.findVariantById(variantId);
  if (!variant) throw new AppError('Variant not found.', 404);
  await ProductModel.updateVariant(variantId, data);
  return ProductModel.findVariantById(variantId);
};

const deleteVariant = async (variantId) => {
  const variant = await ProductModel.findVariantById(variantId);
  if (!variant) throw new AppError('Variant not found.', 404);
  await ProductModel.removeVariant(variantId);
};

module.exports = {
  getAll, getById, create, update, remove,
  createVariant, updateVariant, deleteVariant,
  // Bundle items
  addBundleItem: async (bundleId, item) => {
    await getById(bundleId, true); // ensure bundle exists
    const id = await ProductModel.addBundleItem({ bundle_id: bundleId, ...item });
    return ProductModel.findBundleItems(bundleId);
  },
  removeBundleItem: async (itemId) => {
    await ProductModel.removeBundleItem(itemId);
  },
  clearAndSetBundleItems: async (bundleId, items) => {
    await ProductModel.clearBundleItems(bundleId);
    for (const item of items) {
      await ProductModel.addBundleItem({ bundle_id: bundleId, ...item });
    }
    return ProductModel.findBundleItems(bundleId);
  },
};
