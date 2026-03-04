const express = require('express');
const router = express.Router();
const StatusController = require('../controllers/StatusController');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const { scopeToTenant } = require('../middleware/tenant.middleware');

router.use(verifyToken);
router.use(scopeToTenant);

router.get('/', StatusController.getStatuses);
router.post('/', isAdmin, StatusController.createStatus);
router.put('/:id', isAdmin, StatusController.updateStatus);
router.delete('/:id', isAdmin, StatusController.deleteStatus);

module.exports = router;
