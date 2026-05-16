const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/action/receive_po/:id', purchaseController.receivePO);
router.post('/action/rereceive_po/:id', purchaseController.reReceivePO);
router.post('/action/rfq_to_po/:id', purchaseController.convertRFQtoPO);

module.exports = router;
