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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const autoNum = invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`;
    const { rows } = await client.query(
      `INSERT INTO sales_invoices (customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [customer_id||null, autoNum, total_amount||0, tax_amount||0, discount||0, due_date||null, status||'مسودة', notes, company, req.user?.username]
    );

    const invoice = rows[0];

    // Integrate with system notifications
    try {
      const custRes = await client.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'عميل نقدي';
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'SALES_INVOICE', 'strategic', '/sales')`,
        [`فاتورة مبيعات جديدة: ${autoNum}`, `تم إصدار فاتورة مبيعات جديدة للعميل ${custName} بمبلغ ${total_amount || 0} EGP`]
      );
    } catch (nErr) {
      console.error("Sales invoice notification error:", nErr);
    }

    // Automatic Accounting Entry Posting
    if (status === 'مدفوعة' || status === 'مرسلة') {
      const AccountingService = require('../services/accountingService');
      const amt = parseFloat(total_amount) || 0;
      const tax = parseFloat(tax_amount) || 0;
      const disc = parseFloat(discount) || 0;
      const baseRevenue = amt - tax + disc;

      // Debit Cash/Bank or Accounts Receivable
      const debitAcc = status === 'مدفوعة' ? '1101' : '1120'; // Cash (1101) or Receivables (1120)
      
      await AccountingService.recordDoubleEntry(client, {
        debitAccount: debitAcc,
        creditAccount: '4100', // Sales Revenue (4100)
        amount: baseRevenue,
        costCenter: 'General',
        description: `إيراد مبيعات فاتورة رقم ${autoNum}`,
        username: req.user?.username || 'System',
        referenceNo: autoNum,
        company: company
      });

      if (tax > 0) {
        await AccountingService.recordDoubleEntry(client, {
          debitAccount: debitAcc,
          creditAccount: '2150', // VAT (2150)
          amount: tax,
          costCenter: 'General',
          description: `ضريبة القيمة المضافة فاتورة رقم ${autoNum}`,
          username: req.user?.username || 'System',
          referenceNo: autoNum,
          company: company
        });
      }

      if (disc > 0) {
        await AccountingService.recordDoubleEntry(client, {
          debitAccount: '4100',
          creditAccount: debitAcc,
          amount: disc,
          costCenter: 'General',
          description: `خصم مبيعات فاتورة رقم ${autoNum}`,
          username: req.user?.username || 'System',
          referenceNo: autoNum,
          company: company
        });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: invoice });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { customer_id, payment_method, notes, items, total_amount } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await client.query(
      `INSERT INTO sales_pos_transactions (customer_id, payment_method, notes, items, total_amount, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [customer_id||null, payment_method||'نقدي', notes, JSON.stringify(items||[]), total_amount||0, company, req.user?.username]
    );

    const posTx = rows[0];

    // Integrate with system notifications
    try {
      const custRes = await client.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'عميل نقدي';
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'POS_TRANSACTION', 'warning', '/sales')`,
        [`عملية بيع POS جديدة`, `تمت عملية بيع POS جديدة للعميل ${custName} بمبلغ ${total_amount || 0} EGP بالدفع ${payment_method}`]
      );
    } catch (nErr) {
      console.error("POS transaction notification error:", nErr);
    }

    // Deduct stock levels and post cost of goods sold (COGS)
    const parsedItems = Array.isArray(items) ? items : [];
    const AccountingService = require('../services/accountingService');

    for (const item of parsedItems) {
      const qty = parseFloat(item.qty) || 0;
      if (qty <= 0) continue;

      const itemRes = await client.query(
        `SELECT id, remaining_qty, buy_price, avg_cost, item_name FROM inventory_items 
         WHERE item_name ILIKE $1 AND remaining_qty >= $2 LIMIT 1`,
        [item.name, qty]
      );

      if (itemRes.rows.length > 0) {
        const invItem = itemRes.rows[0];
        const buyPrice = parseFloat(invItem.buy_price || invItem.avg_cost || 0);
        const cogsAmount = qty * buyPrice;

        // 1. Deduct Stock
        await client.query(
          "UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2",
          [qty, invItem.id]
        );

        // 2. Post COGS entry: Debit COGS (5100), Credit Inventory (1130)
        if (cogsAmount > 0) {
          await AccountingService.recordDoubleEntry(client, {
            debitAccount: '5100',
            creditAccount: '1130',
            amount: cogsAmount,
            costCenter: 'General',
            description: `تكلفة مبيعات POS - صنف ${invItem.item_name} - حركة POS-${posTx.id}`,
            username: req.user?.username || 'System',
            referenceNo: `POS-${posTx.id}`,
            company: company
          });
        }
      }
    }

    // Post Revenue Accounting Entry
    const totalAmt = parseFloat(total_amount) || 0;
    if (totalAmt > 0) {
      let debitAcc = '1101'; // Default Cash
      if (payment_method === 'بطاقة' || payment_method === 'تحويل بنكي') {
        debitAcc = '1111'; // Bank
      } else if (payment_method === 'آجل') {
        debitAcc = '1120'; // Receivables
      }

      await AccountingService.recordDoubleEntry(client, {
        debitAccount: debitAcc,
        creditAccount: '4100',
        amount: totalAmt,
        costCenter: 'General',
        description: `إيراد مبيعات POS جديدة - حركة POS-${posTx.id}`,
        username: req.user?.username || 'System',
        referenceNo: `POS-${posTx.id}`,
        company: company
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, data: posTx });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
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
