const Joi = require('joi');

const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .max(120)
    .optional()
    .messages({ 'string.pattern.base': 'Slug must be lowercase letters, numbers and hyphens only.' }),
});

const updateCategorySchema = categorySchema.fork(['name'], (schema) => schema.optional()).min(1);

module.exports = { categorySchema, updateCategorySchema };
