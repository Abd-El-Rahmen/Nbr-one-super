const express = require('express');
const router = express.Router();
const DashboardController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.get('/stats', authMiddleware, roleMiddleware('admin', 'super_admin'), DashboardController.getStats);
router.get('/analytics', authMiddleware, roleMiddleware('admin', 'super_admin'), DashboardController.getAnalytics);

module.exports = router;
