const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Helper: build a simple company WHERE clause
const companyWhere = (req, alias = '') => {
  const company = req.selectedCompany || req.headers['x-selected-company'] || '';
  if (!company || company === 'كل الشركات' || company.toLowerCase() === 'all' || company.toLowerCase() === 'all companies') return '';
  const p = alias ? alias + '.' : '';
  const escaped = company.replace(/'/g, "''");
  return ` AND ${p}company ILIKE '%${escaped}%'`;
};

// ─── SALES INVOICES ──────────────────────────────────────────────────────────
router.get('/invoices', async (req, res) => {
  try {
    const cf = companyWhere(req, 'i');
    const { rows } = await pool.query(`
      SELECT i.*, c.name AS customer_name
      FROM sales_invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE 1=1 ${cf}
      ORDER BY i.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/invoices', async (req, res) => {
  try {
    const { customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const autoNum = invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`;
    const { rows } = await pool.query(
      `INSERT INTO sales_invoices (customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [customer_id||null, autoNum, total_amount||0, tax_amount||0, discount||0, due_date||null, status||'مسودة', notes, company, req.user?.username]
    );

    // Integrate with system notifications
    try {
      const custRes = await pool.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'عميل نقدي';
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'SALES_INVOICE', 'strategic', '/sales')`,
        [`فاتورة مبيعات جديدة: ${autoNum}`, `تم إصدار فاتورة مبيعات جديدة للعميل ${custName} بمبلغ ${total_amount || 0} EGP`]
      );
    } catch (nErr) {
      console.error("Sales invoice notification error:", nErr);
    }

    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POS TRANSACTIONS ────────────────────────────────────────────────────────
router.get('/pos-transactions', async (req, res) => {
  try {
    const cf = companyWhere(req, 'p');
    const { rows } = await pool.query(`
      SELECT p.*, c.name AS customer_name
      FROM sales_pos_transactions p
      LEFT JOIN customers c ON c.id = p.customer_id
      WHERE 1=1 ${cf}
      ORDER BY p.created_at DESC LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/pos-transactions', async (req, res) => {
  try {
    const { customer_id, payment_method, notes, items, total_amount } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO sales_pos_transactions (customer_id, payment_method, notes, items, total_amount, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [customer_id||null, payment_method||'نقدي', notes, JSON.stringify(items||[]), total_amount||0, company, req.user?.username]
    );

    // Integrate with system notifications
    try {
      const custRes = await pool.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'عميل نقدي';
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'POS_TRANSACTION', 'warning', '/sales')`,
        [`عملية بيع POS جديدة`, `تمت عملية بيع POS جديدة للعميل ${custName} بمبلغ ${total_amount || 0} EGP بالدفع ${payment_method}`]
      );
    } catch (nErr) {
      console.error("POS transaction notification error:", nErr);
    }

    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── OFFERS ──────────────────────────────────────────────────────────────────
router.get('/offers', async (req, res) => {
  try {
    const cf = companyWhere(req, 'o');
    const { rows } = await pool.query(`
      SELECT o.* FROM sales_offers o WHERE 1=1 ${cf} ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/offers', async (req, res) => {
  try {
    const { name, discount_type, discount_value, min_purchase, start_date, end_date, status, description } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO sales_offers (name, discount_type, discount_value, min_purchase, start_date, end_date, status, description, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, discount_type||'نسبة', discount_value||0, min_purchase||0, start_date||null, end_date||null, status||'نشط', description, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PRICE LISTS ─────────────────────────────────────────────────────────────
router.get('/price-lists', async (req, res) => {
  try {
    const cf = companyWhere(req);
    const { rows } = await pool.query(`SELECT * FROM sales_price_lists WHERE 1=1 ${cf} ORDER BY id DESC`);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/price-lists', async (req, res) => {
  try {
    const { name, product_name, base_price, selling_price, category, effective_date, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO sales_price_lists (name, product_name, base_price, selling_price, category, effective_date, notes, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, product_name, base_price||0, selling_price||0, category, effective_date||null, notes, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── INSURANCE ───────────────────────────────────────────────────────────────
router.get('/insurance', async (req, res) => {
  try {
    const cf = companyWhere(req, 'i');
    const { rows } = await pool.query(`
      SELECT i.*, c.name AS customer_name
      FROM sales_insurance i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE 1=1 ${cf}
      ORDER BY i.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/insurance', async (req, res) => {
  try {
    const { customer_id, provider, policy_number, coverage_amount, premium, start_date, end_date, status, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO sales_insurance (customer_id, provider, policy_number, coverage_amount, premium, start_date, end_date, status, notes, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [customer_id||null, provider, policy_number, coverage_amount||0, premium||0, start_date||null, end_date||null, status||'نشط', notes, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SALES TARGETS ───────────────────────────────────────────────────────────
router.get('/targets', async (req, res) => {
  try {
    const cf = companyWhere(req);
    const { rows } = await pool.query(`SELECT * FROM sales_targets WHERE 1=1 ${cf} ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/targets', async (req, res) => {
  try {
    const { agent_name, target_amount, achieved_amount, commission_rate, period } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO sales_targets (agent_name, target_amount, achieved_amount, commission_rate, period, company)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [agent_name, target_amount||0, achieved_amount||0, commission_rate||0, period, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── COMMISSIONS ─────────────────────────────────────────────────────────────
router.get('/commissions', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sales_commissions ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── INSTALLMENTS ────────────────────────────────────────────────────────────
router.get('/installments', async (req, res) => {
  try {
    const cf = companyWhere(req, 'i');
    const { rows } = await pool.query(`
      SELECT i.*, c.name AS customer_name
      FROM sales_installments i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE 1=1 ${cf}
      ORDER BY i.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/installments', async (req, res) => {
  try {
    const { customer_id, total_amount, installment_count, monthly_amount, start_date, status, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO sales_installments (customer_id, total_amount, installment_count, monthly_amount, start_date, status, notes, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customer_id||null, total_amount||0, installment_count||12, monthly_amount||0, start_date||null, status||'نشط', notes, company]
    );

    // Integrate with system notifications
    try {
      const custRes = await pool.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'عميل';
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'INSTALLMENT_CREATED', 'strategic', '/sales')`,
        [`جدولة أقساط جديدة`, `تم إعداد خطة أقساط جديدة للعميل ${custName} بقيمة إجمالية ${total_amount || 0} EGP على ${installment_count} شهور`]
      );
    } catch (nErr) {
      console.error("Installment notification error:", nErr);
    }

    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
