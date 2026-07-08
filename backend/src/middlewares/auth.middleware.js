const { verifyToken } = require('../utils/jwt.helper');
const AppError = require('../utils/AppError');

/**
 * Verifies JWT from Authorization header.
 * Attaches decoded user to req.user.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please provide a valid token.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again.', 401));
    }
    return next(new AppError('Invalid token. Please login again.', 401));
  }
};

module.exports = authMiddleware;
