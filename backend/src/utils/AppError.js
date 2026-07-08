/**
 * Custom error class for operational errors (HTTP errors we intentionally throw).
 * Non-operational errors (bugs) will NOT be instances of AppError.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
