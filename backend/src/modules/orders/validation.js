const Joi = require('joi');

const createOrderSchema = Joi.object({
  customer: Joi.object({
    full_name: Joi.string().min(2).max(150).required(),
    phone: Joi.string().min(7).max(30).required(),
    address_line: Joi.string().max(255).optional().allow('', null),
    postal_code: Joi.string().max(20).optional().allow('', null),
    wilaya_code: Joi.string().max(10).optional().allow('', null),
    wilaya: Joi.string().max(100).optional().allow('', null),
    commune: Joi.string().max(100).optional().allow('', null),
  }).required(),

  delivery_type: Joi.string().valid('home', 'desk', 'stop_desk').optional(),
  delivery_fee: Joi.number().min(0).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        variant_id: Joi.number().integer().positive().optional().allow(null),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required()
    .messages({ 'array.min': 'Order must contain at least one item.' }),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'shipped', 'rejected', 'delivered', 'failed')
    .required(),
});

module.exports = { createOrderSchema, updateStatusSchema };
