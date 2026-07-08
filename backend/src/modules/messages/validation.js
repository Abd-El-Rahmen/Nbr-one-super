const Joi = require('joi');

const createMessageSchema = Joi.object({
  order_id: Joi.number().integer().positive().optional().allow(null),
  sender_type: Joi.string().valid('customer', 'admin').required(),
  message: Joi.string().min(1).max(2000).required(),
});

module.exports = { createMessageSchema };
