const AppError = require('../utils/AppError');

/**
 * Restricts access to specific roles.
 * Must be used AFTER authMiddleware.
 * Usage: roleMiddleware('super_admin') or roleMiddleware('admin', 'super_admin')
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(`Access denied. Required role: ${allowedRoles.join(' or ')}.`, 403)
      );
    }

    next();
  };
};

module.exports = roleMiddleware;
