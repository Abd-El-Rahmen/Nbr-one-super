const express = require('express');
const router = express.Router();
const ComplaintController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createComplaintSchema, updateStatusSchema } = require('./validation');

// Public — anyone can submit a complaint
router.post('/', validate(createComplaintSchema), ComplaintController.create);

// Admin
router.get('/', authMiddleware, ComplaintController.getAll);
router.get('/:id', authMiddleware, ComplaintController.getOne);
router.patch('/:id/status', authMiddleware, validate(updateStatusSchema), ComplaintController.updateStatus);

module.exports = router;
