const express = require('express');
const router = express.Router();
const InventoryController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { restockSchema } = require('./validation');

router.use(authMiddleware);

router.get('/logs', InventoryController.getLogs);
router.post('/restock', validate(restockSchema), InventoryController.restock);
router.post('/bulk-restock', InventoryController.bulkRestock);

module.exports = router;
