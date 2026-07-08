const express = require('express');
const router = express.Router();
const MessageController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createMessageSchema } = require('./validation');

// Public — customers can send messages
router.post('/', validate(createMessageSchema), MessageController.create);

// Admin — read messages (optionally filtered by order_id)
router.get('/', authMiddleware, MessageController.getAll);

module.exports = router;
