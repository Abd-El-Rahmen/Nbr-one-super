const AppError = require('../utils/AppError');

/**
 * Factory that returns an Express middleware validating req.body against a Joi schema.
 * Usage: validate(myJoiSchema)
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,   // return all errors, not just the first
      stripUnknown: true,  // remove unknown keys from payload
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new AppError(message, 422));
    }

    req[target] = value; // replace with sanitized value
    next();
  };
};

module.exports = validate;
