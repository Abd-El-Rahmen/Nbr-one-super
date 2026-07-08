const express = require('express');
const router = express.Router();
const UserController = require('./controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createUserSchema, updateUserSchema } = require('./validation');

// All user management is super_admin only
router.use(authMiddleware, roleMiddleware('super_admin'));

router.get('/', UserController.getAll);
router.get('/:id', UserController.getOne);
router.post('/', validate(createUserSchema), UserController.create);
router.put('/:id', validate(updateUserSchema), UserController.update);
router.delete('/:id', UserController.remove);

module.exports = router;
