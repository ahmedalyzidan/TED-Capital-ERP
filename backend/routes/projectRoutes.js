const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/dropdowns', projectController.getProjectsDropdown);
router.get('/subcontractor_items/:sub_id', projectController.getSubcontractorItems);
router.get('/boq_subcontractors/:boq_id', projectController.getBOQSubcontractors);
router.get('/boq_invoices/:boq_id', projectController.getBOQInvoices);
router.post('/distribute-profit/:project_id', projectController.distributeProfit);
router.get('/sync/:id', projectController.syncProject);

module.exports = router;
