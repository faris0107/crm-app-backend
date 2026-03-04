const express = require('express');
const router = express.Router();
const RoleController = require('../controllers/RoleController');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const { scopeToTenant } = require('../middleware/tenant.middleware');

router.use(verifyToken);
router.use(scopeToTenant);

router.get('/', RoleController.getRoles);

module.exports = router;
