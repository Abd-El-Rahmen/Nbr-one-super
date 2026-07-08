const express = require('express');
const router = express.Router();
const DeliveryPricingController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/', DeliveryPricingController.getAll);
router.put('/:tier_id', authMiddleware, DeliveryPricingController.update);

module.exports = router;
