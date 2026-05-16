const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/balances', customerController.getAllClientBalances);
router.get('/client-360/:client_id', customerController.getClient360);
router.post('/pay-delayed-balance', customerController.payDelayedBalance);

// CRM Interactions
router.get('/interactions/:client_id', customerController.getInteractions);
router.post('/interactions', customerController.addInteraction);
router.get('/:client_id/statement', customerController.getClientStatement);

module.exports = router;
