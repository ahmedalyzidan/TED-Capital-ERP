const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const salesController = require('../controllers/salesController');
const purchaseController = require('../controllers/purchaseController');
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.post('/allocate-expense', purchaseController.allocateExpense);
router.post('/receive_po/:id', purchaseController.receivePO);

router.get('/usage_history', async (req, res) => {
    try {
        const { material, project } = req.query;
        let q = "SELECT * FROM material_usage WHERE material = $1";
        let params = [material];
        if (project && project !== 'null' && project !== '') { q += " AND project_name = $2"; params.push(project); }
        q += " ORDER BY id DESC";
        const result = await pool.query(q, params);
        res.json({ data: result.rows });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

router.post('/sales', salesController.addSale);
router.post('/bookings', salesController.addBooking);
router.post('/bookings/:id/complete', salesController.completeBooking);
router.post('/bookings/:id/refund', salesController.refundBooking);
router.post('/bookings/:id/transfer-credit', salesController.transferBookingToBalance);

router.get('/intelligence', inventoryController.getInventoryIntelligence);
router.get('/financial-accounts', inventoryController.getFinancialAccounts || (async (req, res) => {
    try {
        const pool = require('../config/db');
        const query = `
            SELECT id, account_code, account_name 
            FROM chart_of_accounts 
            WHERE account_code LIKE '110%' OR account_code LIKE '111%'
            ORDER BY account_code ASC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
}));
router.post('/supplier-deposit', inventoryController.handleSupplierDeposit);
router.post('/transfer', inventoryController.handleTransfer);

module.exports = router;
