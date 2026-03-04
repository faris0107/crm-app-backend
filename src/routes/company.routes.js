const express = require('express');
const router = express.Router();
const CompanyController = require('../controllers/CompanyController');
const { verifyToken, isSystemUser } = require('../middleware/auth.middleware');

router.use(verifyToken);
router.use(isSystemUser); // Only users with entity_id = NULL can manage companies

router.post('/', CompanyController.createCompany);
router.get('/stats', CompanyController.getStats);
router.get('/', CompanyController.getCompanies);
router.put('/:id', CompanyController.updateCompany);
router.delete('/:id', CompanyController.deleteCompany);
router.post('/:id/restore', CompanyController.restoreCompany);

module.exports = router;
