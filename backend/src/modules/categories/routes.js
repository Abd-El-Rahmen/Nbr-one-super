const express = require('express');
const router = express.Router();
const CategoryController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { categorySchema, updateCategorySchema } = require('./validation');

const { upload } = require('../../config/cloudinary');

const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      err.statusCode = err.statusCode || 400;
      err.isOperational = true;
      return next(err);
    }
    next();
  });
};

// Public
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getOne);

// Admin only
router.post('/', authMiddleware, uploadSingle('image'), validate(categorySchema), CategoryController.create);
router.put('/:id', authMiddleware, uploadSingle('image'), validate(updateCategorySchema), CategoryController.update);
router.delete('/:id', authMiddleware, CategoryController.remove);

module.exports = router;
