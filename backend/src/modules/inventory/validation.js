const Joi = require('joi');

const restockSchema = Joi.object({
  variant_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
  reason: Joi.string().valid('restock', 'manual').default('restock'),
});

module.exports = { restockSchema };
