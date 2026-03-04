const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { verifyToken, isAdmin, isStaffOrAdmin } = require('../middleware/auth.middleware');
const { scopeToTenant } = require('../middleware/tenant.middleware');

router.use(verifyToken);
router.use(scopeToTenant);

router.get('/', isStaffOrAdmin, UserController.getUsers);
router.post('/', isStaffOrAdmin, UserController.addUser);
router.put('/:id', isStaffOrAdmin, UserController.updateUser);
router.delete('/:id', isAdmin, UserController.deleteUser);
router.post('/:id/restore', isAdmin, UserController.restoreUser);

module.exports = router;
