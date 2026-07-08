const express = require('express');
const router = express.Router();
const OrderController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createOrderSchema, updateStatusSchema } = require('./validation');

// Public — guest checkout
router.post('/', validate(createOrderSchema), OrderController.create);

// Public — track order by id and phone
router.get('/track', OrderController.track);

// Admin
router.get('/', authMiddleware, OrderController.getAll);
router.get('/:id', authMiddleware, OrderController.getOne);
router.patch('/:id/status', authMiddleware, validate(updateStatusSchema), OrderController.updateStatus);

module.exports = router;
