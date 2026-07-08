const Joi = require('joi');

const createComplaintSchema = Joi.object({
  customer_name: Joi.string().max(150).optional().allow('', null),
  phone: Joi.string().max(30).optional().allow('', null),
  message: Joi.string().min(5).max(2000).required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('open', 'in_progress', 'closed').required(),
});

module.exports = { createComplaintSchema, updateStatusSchema };
