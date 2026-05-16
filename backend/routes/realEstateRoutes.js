const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const realEstateController = require('../controllers/realEstateController');

router.use(authenticateToken);

// المشاريع والوحدات
router.post('/projects', realEstateController.addProject);
router.post('/units', realEstateController.addUnit);

// العقود والأقساط
router.post('/contracts', realEstateController.createContract);
router.post('/installments/pay', realEstateController.payInstallment);
router.post('/action/generate_installments', realEstateController.generateInstallments);

// الحجوزات (Pre-orders)
router.post('/create_preorder', realEstateController.createPreOrder);
router.post('/action/fulfill_preorder/:id', realEstateController.fulfillPreOrder);
router.post('/action/refund_preorder/:id', realEstateController.refundPreOrder);
router.post('/action/transfer_preorder/:id', realEstateController.transferPreOrder);

// عمليات التعديل (Update)
router.put('/projects/:id', realEstateController.updateProject);
router.put('/units/:id', realEstateController.updateUnit);
router.put('/contracts/:id', realEstateController.updateContract);
router.put('/installments/:id', realEstateController.updateInstallment);

// عمليات الحذف (Delete)
router.delete('/projects/:id', realEstateController.deleteProject);
router.delete('/units/:id', realEstateController.deleteUnit);
router.delete('/contracts/:id', realEstateController.deleteContract);
router.delete('/installments/:id', realEstateController.deleteInstallment);

// داشبورد العميل
router.get('/client_dashboard/:client_id', async (req, res) => {
    // ... (كود الداشبورد الموجود مسبقاً)
});

module.exports = router;
