const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');
const realEstateController = require('../controllers/realEstateController');
const AccountingService = require('../services/accountingService');

router.use(authenticateToken);

// ─── المشاريع والوحدات ────────────────────────────────────────────────────────
router.post('/projects', realEstateController.addProject);
router.post('/units', realEstateController.addUnit);

// ─── الوسطاء والعمولات ────────────────────────────────────────────────────────
router.post('/brokers', realEstateController.addBroker);
router.get('/brokers', realEstateController.getBrokers);
router.post('/commissions/pay', realEstateController.payBrokerCommission);

// ─── العقود والأقساط ──────────────────────────────────────────────────────────
router.post('/contracts', realEstateController.createContract);
router.post('/installments/pay', realEstateController.payInstallment);
router.post('/action/generate_installments', realEstateController.generateInstallments);

// ─── الحجوزات (Pre-orders) ────────────────────────────────────────────────────
router.post('/create_preorder', realEstateController.createPreOrder);
router.post('/action/fulfill_preorder/:id', realEstateController.fulfillPreOrder);
router.post('/action/refund_preorder/:id', realEstateController.refundPreOrder);
router.post('/action/transfer_preorder/:id', realEstateController.transferPreOrder);

// ─── عمليات التعديل (Update) ──────────────────────────────────────────────────
router.put('/projects/:id', realEstateController.updateProject);
router.put('/units/:id', realEstateController.updateUnit);
router.put('/contracts/:id', realEstateController.updateContract);
router.put('/installments/:id', realEstateController.updateInstallment);

// ─── عمليات الحذف (Delete) ────────────────────────────────────────────────────
router.delete('/projects/:id', realEstateController.deleteProject);
router.delete('/units/:id', realEstateController.deleteUnit);
router.delete('/contracts/:id', realEstateController.deleteContract);
router.delete('/installments/:id', realEstateController.deleteInstallment);

// ─── داشبورد العميل ───────────────────────────────────────────────────────────
router.get('/client_dashboard/:client_id', async (req, res) => {
    res.json({ success: true, data: {} });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SALES CROSS-MODULE: Contract → Sales Order / Installment Plan
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/contracts/:id/create-sales-order', async (req, res) => {
  try {
    const contractId = req.params.id;
    const { rows } = await pool.query(
      `SELECT rc.*, c.id AS customer_fk
       FROM real_estate_contracts rc
       LEFT JOIN customers c ON c.customer_id = c.id
       WHERE rc.id = $1 LIMIT 1`, [contractId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'العقد غير موجود' });
    const contract = rows[0];
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const soNum = `SO-RE-${Date.now().toString(36).toUpperCase()}`;
    const items = [{ name: `وحدة — عقد رقم ${contractId}`, qty: 1, price: parseFloat(contract.total_price || 0) }];
    const result = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, items, total_amount, status, source_module, company, notes, created_by)
       VALUES ($1,$2,$3,$4,'Pending','RealEstate',$5,$6,$7) RETURNING id, order_number`,
      [soNum, contract.customer_id || null, JSON.stringify(items), contract.total_price || 0, company,
       `مرتبط بعقد عقاري رقم ${contractId}`, req.user?.username]
    );
    res.json({ success: true, data: result.rows[0], message: `تم إنشاء أمر البيع ${soNum} بنجاح` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/contracts/:id/create-installment-plan', async (req, res) => {
  try {
    const contractId = req.params.id;
    const { installment_count = 12 } = req.body;
    const { rows } = await pool.query(
      `SELECT * FROM real_estate_contracts WHERE id = $1 LIMIT 1`, [contractId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'العقد غير موجود' });
    const contract = rows[0];
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const total = parseFloat(contract.total_price || 0);
    const monthly = Math.ceil(total / installment_count);
    const result = await pool.query(
      `INSERT INTO sales_installments (customer_id, total_amount, installment_count, monthly_amount, start_date, status, source_module, company, notes)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,'نشط','RealEstate',$5,$6) RETURNING id`,
      [contract.customer_id || null, total, installment_count, monthly, company,
       `خطة أقساط عقد عقاري رقم ${contractId}`]
    );
    res.json({ success: true, data: result.rows[0], monthly_amount: monthly });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT COSTS — تكاليف المشروع
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/project-costs/:project_id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM re_project_costs WHERE project_id=$1 ORDER BY cost_date DESC, id DESC`,
      [req.params.project_id]
    );
    const summary = await pool.query(
      `SELECT cost_category, SUM(amount) AS total FROM re_project_costs
       WHERE project_id=$1 GROUP BY cost_category ORDER BY total DESC`,
      [req.params.project_id]
    );
    const grand = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS grand_total FROM re_project_costs WHERE project_id=$1`,
      [req.params.project_id]
    );
    res.json({ success: true, data: rows, summary: summary.rows, grand_total: grand.rows[0]?.grand_total || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/project-costs', async (req, res) => {
  try {
    const { project_id, cost_category, description, amount, supplier, invoice_ref, cost_date } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO re_project_costs (project_id, cost_category, description, amount, supplier, invoice_ref, cost_date, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,CURRENT_DATE),$8,$9) RETURNING *`,
      [project_id, cost_category || 'بناء', description, parseFloat(amount) || 0, supplier, invoice_ref, cost_date, company, req.user?.username]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/project-costs/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM re_project_costs WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── COST ALLOCATION: توزيع التكاليف على الوحدات (نسبي بالمساحة) ─────────────
router.post('/project-costs/:project_id/allocate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const projectId = req.params.project_id;
    const { target_margin_pct = 30 } = req.body;

    const costRes = await client.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM re_project_costs WHERE project_id=$1`, [projectId]
    );
    const totalCost = parseFloat(costRes.rows[0].total) || 0;
    if (totalCost === 0) throw new Error('لا توجد تكاليف مسجلة لهذا المشروع بعد');

    const unitsRes = await client.query(
      `SELECT id, area, price, unit_number FROM real_estate_units WHERE project_id=$1 AND area > 0`,
      [projectId]
    );
    if (unitsRes.rows.length === 0) throw new Error('لا توجد وحدات بمساحات محددة في هذا المشروع');

    const totalArea = unitsRes.rows.reduce((s, u) => s + parseFloat(u.area || 0), 0);
    if (totalArea === 0) throw new Error('إجمالي مساحات الوحدات = 0');

    const results = [];
    for (const unit of unitsRes.rows) {
      const unitArea = parseFloat(unit.area) || 0;
      const sellingPrice = parseFloat(unit.price) || 0;
      const allocatedCost = (unitArea / totalArea) * totalCost;
      const costPerMeter = unitArea > 0 ? allocatedCost / unitArea : 0;
      const marginAmount = sellingPrice - allocatedCost;
      const marginPct = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
      const suggestedPrice = allocatedCost * (1 + target_margin_pct / 100);

      await client.query(
        `INSERT INTO re_unit_costs (unit_id, project_id, total_project_cost, unit_area, total_project_area,
           allocated_cost, cost_per_meter, selling_price, margin_amount, margin_pct, suggested_price, target_margin_pct, last_calculated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
         ON CONFLICT (unit_id) DO UPDATE SET
           total_project_cost=$3, unit_area=$4, total_project_area=$5,
           allocated_cost=$6, cost_per_meter=$7, selling_price=$8, margin_amount=$9,
           margin_pct=$10, suggested_price=$11, target_margin_pct=$12, last_calculated_at=NOW()`,
        [unit.id, projectId, totalCost, unitArea, totalArea, allocatedCost, costPerMeter,
         sellingPrice, marginAmount, marginPct, suggestedPrice, target_margin_pct]
      );

      await client.query(
        `UPDATE real_estate_units SET cost_per_meter=$1, suggested_price=$2 WHERE id=$3`,
        [costPerMeter, suggestedPrice, unit.id]
      );

      results.push({ unit_id: unit.id, unit_number: unit.unit_number, unit_area: unitArea, allocated_cost: allocatedCost, cost_per_meter: costPerMeter, margin_pct: marginPct, suggested_price: suggestedPrice });
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `تم توزيع التكاليف على ${results.length} وحدة بنجاح`,
      total_project_cost: totalCost,
      total_project_area: totalArea,
      cost_per_meter_project: totalArea > 0 ? totalCost / totalArea : 0,
      units: results
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── UNIT COSTS ───────────────────────────────────────────────────────────────
router.get('/unit-costs/:unit_id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT uc.*, u.unit_number, u.type AS unit_type, u.floor, p.name AS project_name
       FROM re_unit_costs uc
       LEFT JOIN real_estate_units u ON u.id = uc.unit_id
       LEFT JOIN real_estate_projects p ON p.id = uc.project_id
       WHERE uc.unit_id=$1`, [req.params.unit_id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/unit-costs-by-project/:project_id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT uc.*, u.unit_number, u.type AS unit_type, u.floor, u.area, u.price, u.status
       FROM re_unit_costs uc
       LEFT JOIN real_estate_units u ON u.id = uc.unit_id
       WHERE uc.project_id=$1
       ORDER BY uc.margin_pct ASC`,
      [req.params.project_id]
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RENTAL CONTRACTS — عقود الإيجار
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/rental-contracts', async (req, res) => {
  try {
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const cf = (!company || company === 'كل الشركات' || company.toLowerCase() === 'all' || company.toLowerCase() === 'all companies')
      ? '' : ` AND rc.company ILIKE '%${company.replace(/'/g, "''")}%'`;
    const { rows } = await pool.query(
      `SELECT rc.*, u.unit_number, u.type AS unit_type, u.area, p.name AS project_name
       FROM re_rental_contracts rc
       LEFT JOIN real_estate_units u ON u.id = rc.unit_id
       LEFT JOIN real_estate_projects p ON p.id = rc.project_id
       WHERE 1=1 ${cf}
       ORDER BY rc.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rental-contracts', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { project_id, unit_id, tenant_name, tenant_phone, tenant_id_no,
            monthly_rent, annual_increment_pct, security_deposit, deposit_paid,
            start_date, end_date, payment_day, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const cNum = `RC-${Date.now().toString(36).toUpperCase()}`;
    const start = new Date(start_date);
    const end = new Date(end_date);
    const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)));

    const { rows } = await client.query(
      `INSERT INTO re_rental_contracts (contract_number, project_id, unit_id, tenant_name, tenant_phone, tenant_id_no,
         monthly_rent, annual_increment_pct, security_deposit, deposit_paid, start_date, end_date, duration_months,
         payment_day, status, notes, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Active',$15,$16,$17) RETURNING *`,
      [cNum, project_id || null, unit_id || null, tenant_name, tenant_phone, tenant_id_no,
       parseFloat(monthly_rent) || 0, parseFloat(annual_increment_pct) || 10,
       parseFloat(security_deposit) || 0, deposit_paid || false, start_date, end_date, months,
       parseInt(payment_day) || 1, notes, company, req.user?.username]
    );
    const contract = rows[0];

    if (unit_id) {
      await client.query(`UPDATE real_estate_units SET rental_status='Rented' WHERE id=$1`, [unit_id]);
    }

    if (parseFloat(security_deposit) > 0 && deposit_paid) {
      await AccountingService.recordDoubleEntry(client, {
        debitAccount: 'صندوق نقدية - تيد كابيتال',
        creditAccount: 'ودائع إيجار مستلمة',
        amount: parseFloat(security_deposit),
        costCenter: 'RealEstate',
        description: `ضمان إيجار عقد ${cNum} — مستأجر: ${tenant_name}`,
        username: req.user?.username || 'System'
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, data: contract });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.patch('/rental-contracts/:id/terminate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE re_rental_contracts SET status='Terminated' WHERE id=$1 RETURNING *`, [req.params.id]
    );
    if (rows[0]?.unit_id) {
      await client.query(`UPDATE real_estate_units SET rental_status='Available' WHERE id=$1`, [rows[0].unit_id]);
    }
    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── GENERATE RENTAL INVOICE for a specific month ─────────────────────────────
router.post('/rental-contracts/:id/generate-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const contractId = req.params.id;
    const { period_month, period_year } = req.body;
    const now = new Date();
    const month = parseInt(period_month) || (now.getMonth() + 1);
    const year = parseInt(period_year) || now.getFullYear();

    const cRes = await client.query(`SELECT * FROM re_rental_contracts WHERE id=$1`, [contractId]);
    if (cRes.rows.length === 0) throw new Error('العقد غير موجود');
    const c = cRes.rows[0];
    if (c.status !== 'Active') throw new Error('العقد غير نشط');

    const invNum = `RINV-${contractId}-${year}${String(month).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;
    const dueDay = c.payment_day || 1;
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(dueDay, 28)).padStart(2, '0')}`;

    const { rows } = await client.query(
      `INSERT INTO re_rental_invoices (invoice_number, contract_id, unit_id, tenant_name, period_month, period_year, amount, due_date, status, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pending',$9)
       ON CONFLICT (contract_id, period_month, period_year) DO NOTHING RETURNING *`,
      [invNum, contractId, c.unit_id, c.tenant_name, month, year, c.monthly_rent, dueDate, c.company]
    );

    await client.query('COMMIT');
    if (rows.length === 0) return res.json({ success: true, message: 'الفاتورة موجودة مسبقاً لهذا الشهر', data: null });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── RENTAL INVOICES LIST ─────────────────────────────────────────────────────
router.get('/rental-invoices', async (req, res) => {
  try {
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const cf = (!company || company === 'كل الشركات' || company.toLowerCase() === 'all' || company.toLowerCase() === 'all companies')
      ? '' : ` AND ri.company ILIKE '%${company.replace(/'/g, "''")}%'`;
    const { rows } = await pool.query(
      `SELECT ri.*, u.unit_number, p.name AS project_name
       FROM re_rental_invoices ri
       LEFT JOIN real_estate_units u ON u.id = ri.unit_id
       LEFT JOIN re_rental_contracts rc ON rc.id = ri.contract_id
       LEFT JOIN real_estate_projects p ON p.id = rc.project_id
       WHERE 1=1 ${cf}
       ORDER BY ri.period_year DESC, ri.period_month DESC, ri.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PAY RENTAL INVOICE ───────────────────────────────────────────────────────
router.post('/rental-invoices/:id/pay', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { amount_paid, payment_method = 'Cash', reference_no, notes } = req.body;
    const invId = req.params.id;

    const invRes = await client.query(`SELECT * FROM re_rental_invoices WHERE id=$1 FOR UPDATE`, [invId]);
    if (invRes.rows.length === 0) throw new Error('الفاتورة غير موجودة');
    const inv = invRes.rows[0];
    if (inv.status === 'Paid') throw new Error('الفاتورة مدفوعة مسبقاً');

    const paid = parseFloat(amount_paid) || parseFloat(inv.amount);

    await client.query(
      `INSERT INTO re_rental_payments (invoice_id, contract_id, amount_paid, payment_date, payment_method, reference_no, notes, created_by)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7)`,
      [invId, inv.contract_id, paid, payment_method, reference_no, notes, req.user?.username]
    );

    await client.query(`UPDATE re_rental_invoices SET status='Paid', paid_date=CURRENT_DATE WHERE id=$1`, [invId]);

    const debitAcc = (payment_method === 'Transfer' || payment_method === 'Bank' || payment_method === 'Cheque')
      ? 'بنك CIB - تيد كابيتال' : 'صندوق نقدية - تيد كابيتال';

    await AccountingService.recordDoubleEntry(client, {
      debitAccount: debitAcc,
      creditAccount: 'إيرادات إيجار عقاري',
      amount: paid,
      costCenter: 'RealEstate',
      description: `إيجار ${inv.period_month}/${inv.period_year} — مستأجر: ${inv.tenant_name} — فاتورة ${inv.invoice_number}`,
      username: req.user?.username || 'System'
    });

    await client.query('COMMIT');
    res.json({ success: true, message: 'تم تسجيل الدفع والقيد المحاسبي بنجاح' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;
