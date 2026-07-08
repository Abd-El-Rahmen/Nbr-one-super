const express = require('express');
const router = express.Router();
const ProductController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { upload } = require('../../config/cloudinary');
const {
  productSchema, updateProductSchema,
  variantSchema, updateVariantSchema,
} = require('./validation');

// Optional auth — enriches response for admins (e.g. inactive products)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  next();
};

/**
 * Wraps multer upload so any upload/Cloudinary errors are forwarded to the
 * Express global error handler instead of becoming unhandled rejections that
 * could crash the server.
 */
const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      // Multer / Cloudinary error — convert to a safe Express error
      err.statusCode = err.statusCode || 400;
      err.isOperational = true;
      return next(err);
    }
    next();
  });
};

const { getAll, getOne, create, update, remove, createVariant, updateVariant, deleteVariant, setBundleItems, deleteBundleItem } = ProductController;

// ─── Public ──────────────────────────────────────────────────────────────────
router.get('/', optionalAuth, getAll);
router.get('/:id', optionalAuth, getOne);

// ─── Admin — products ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, uploadSingle('image'), validate(productSchema), create);
router.put('/:id', authMiddleware, uploadSingle('image'), validate(updateProductSchema), update);
router.delete('/:id', authMiddleware, remove);

// ─── Admin — variants ─────────────────────────────────────────────────────────
router.post('/:id/variants', authMiddleware, validate(variantSchema), createVariant);
router.put('/variants/:variantId', authMiddleware, validate(updateVariantSchema), updateVariant);
router.delete('/variants/:variantId', authMiddleware, deleteVariant);

// ─── Admin — bundle items ─────────────────────────────────────────────────────
router.put('/:id/bundle-items', authMiddleware, setBundleItems);
router.delete('/bundle-items/:itemId', authMiddleware, deleteBundleItem);

module.exports = router;
