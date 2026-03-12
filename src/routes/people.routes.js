const express = require('express');
const router = express.Router();
const PeopleController = require('../controllers/PeopleController');
const { verifyToken } = require('../middleware/auth.middleware');
const { scopeToTenant } = require('../middleware/tenant.middleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(verifyToken);
router.use(scopeToTenant);

/**
 * @swagger
 * /api/people:
 *   get:
 *     summary: List all contacts for the entity
 *     tags: [CRM]
 *   post:
 *     summary: Create a new contact
 *     tags: [CRM]
 */
router.get('/', PeopleController.getPeople);
router.post('/', PeopleController.createPerson);

/**
 * @swagger
 * /api/people/{id}:
 *   get:
 *     summary: Get detailed contact information with timeline
 *     tags: [CRM]
 *   put:
 *     summary: Update contact details (RBAC restricted)
 *     tags: [CRM]
 */
// Bulk operations
router.get('/download-template', PeopleController.downloadTemplate);
router.post('/bulk-upload', upload.single('file'), PeopleController.bulkUpload);

router.get('/:id', PeopleController.getPerson);
router.put('/:id', PeopleController.updatePerson);

module.exports = router;
