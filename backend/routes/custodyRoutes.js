const express = require('express');
const router = express.Router();
const custodyController = require('../controllers/custodyController');
const { authenticateToken } = require('../middlewares/auth');

// All custody endpoints require authentication
router.use(authenticateToken);

router.post('/', custodyController.createCustody);
router.get('/', custodyController.getCustodies);
router.get('/:id', custodyController.getCustodyDetails);
router.post('/:id/expenses', custodyController.addCustodyExpense);
router.put('/expenses/:expense_id/approve', custodyController.approveExpense);
router.put('/expenses/:expense_id/reject', custodyController.rejectExpense);
router.post('/:id/settle', custodyController.settleCustody);

module.exports = router;
