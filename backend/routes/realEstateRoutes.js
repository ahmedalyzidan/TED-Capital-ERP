const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');
const realEstateController = require('../controllers/realEstateController');
const AccountingService = require('../services/accountingService');

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

// ─── SALES CROSS-MODULE: Contract → Sales Order ──────────────────────────────
router.post('/contracts/:id/create-sales-order', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, c.id AS customer_fk
       FROM re_contracts rc
       LEFT JOIN customers c ON c.name ILIKE '%' || rc.client_name || '%'
       WHERE rc.id = $1 LIMIT 1`, [contractId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'العقد غير موجود' });
    const contract = rows[0];

    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const soNum = `SO-RE-${Date.now().toString(36).toUpperCase()}`;
    const items = [{
      name: `وحدة ${contract.unit_id || ''} — عقد رقم ${contractId}`,
      qty: 1,
      price: parseFloat(contract.total_value || 0)
    }];

    const result = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, items, total_amount, status, source_module, company, notes, created_by)
       VALUES ($1,$2,$3,$4,'Pending','RealEstate',$5,$6,$7) RETURNING id, order_number`,
      [soNum, contract.customer_fk || null, JSON.stringify(items), contract.total_value || 0, company,
       `مرتبط بعقد عقاري رقم ${contractId}`, req.user?.username]
    );

    res.json({ success: true, data: result.rows[0], message: `تم إنشاء أمر البيع ${soNum} بنجاح` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SALES CROSS-MODULE: Contract → Installment Plan ─────────────────────────
router.post('/contracts/:id/create-installment-plan', async (req, res) => {
  try {
    const pool = require('../config/db');
    const contractId = req.params.id;
    const { installment_count = 12 } = req.body;

    const { rows } = await pool.query(
      `SELECT rc.*, c.id AS customer_fk
       FROM re_contracts rc
       LEFT JOIN customers c ON c.name ILIKE '%' || rc.client_name || '%'
       WHERE rc.id = $1 LIMIT 1`, [contractId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'العقد غير موجود' });
    const contract = rows[0];

    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const total = parseFloat(contract.total_value || 0);
    const monthly = Math.ceil(total / installment_count);

    const result = await pool.query(
      `INSERT INTO sales_installments (customer_id, total_amount, installment_count, monthly_amount, start_date, status, source_module, company, notes)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,'نشط','RealEstate',$5,$6) RETURNING id`,
      [contract.customer_fk || null, total, installment_count, monthly, company,
       `خطة أقساط عقد عقاري رقم ${contractId}`]
    );

    res.json({ success: true, data: result.rows[0], monthly_amount: monthly });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
