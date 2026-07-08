const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  description: Joi.string().max(5000).optional().allow(''),
  category_id: Joi.number().integer().positive().optional().allow(null),
  base_price: Joi.number().positive().precision(2).required(),
  compare_at_price: Joi.number().positive().precision(2).optional().allow(null, ''),
  is_bundle: Joi.boolean().truthy('1', 'true').falsy('0', 'false').optional(),
  volume_offers: Joi.any().optional(), // Can be string or JSON array
  is_active: Joi.boolean().truthy('1', 'true').falsy('0', 'false').default(true),
});

// Separate update schema — no defaults so partial updates don't overwrite unrelated fields
const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  description: Joi.string().max(5000).optional().allow(''),
  category_id: Joi.number().integer().positive().optional().allow(null, ''),
  base_price: Joi.number().positive().precision(2).optional(),
  compare_at_price: Joi.number().positive().precision(2).optional().allow(null, ''),
  is_bundle: Joi.boolean().truthy('1', 'true').falsy('0', 'false').optional(),
  volume_offers: Joi.any().optional(),
  is_active: Joi.boolean().truthy('1', 'true').falsy('0', 'false').optional(),
}).min(1);

const variantSchema = Joi.object({
  name: Joi.string().min(1).max(150).required(),
  sku: Joi.string().max(100).optional().allow('', null),
  price_override: Joi.number().positive().precision(2).optional().allow(null, ''),
  compare_at_price_override: Joi.number().positive().precision(2).optional().allow(null, ''),
  volume_offers: Joi.any().optional(), // Can be string or JSON array
  stock_quantity: Joi.number().integer().min(0).default(0),
});

// Separate update schema — no defaults so partial updates don't overwrite unrelated fields
const updateVariantSchema = Joi.object({
  name: Joi.string().min(1).max(150).optional(),
  sku: Joi.string().max(100).optional().allow('', null),
  price_override: Joi.number().positive().precision(2).optional().allow(null, ''),
  compare_at_price_override: Joi.number().positive().precision(2).optional().allow(null, ''),
  volume_offers: Joi.any().optional(),
  stock_quantity: Joi.number().integer().min(0).optional(),
}).min(1);

module.exports = { productSchema, updateProductSchema, variantSchema, updateVariantSchema };
