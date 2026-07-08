const express = require('express');
const router = express.Router();
const AuthController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { loginSchema } = require('./validation');

router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authMiddleware, AuthController.getMe);

module.exports = router;
