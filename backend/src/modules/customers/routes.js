const express = require('express');
const router = express.Router();
const CustomerController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', CustomerController.getAll);
router.get('/:id', CustomerController.getOne);

module.exports = router;
