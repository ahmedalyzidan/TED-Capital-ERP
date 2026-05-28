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
    const { customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes, salesperson_id, sales_type, commission_rate, payment_method, amount_paid, remaining_balance, items } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const autoNum = invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`;
    const commRate = parseFloat(commission_rate) || 0;
    const totalAmt = parseFloat(total_amount) || 0;
    const commAmt = totalAmt * (commRate / 100);

    // If payment method is customer wallet, deduct the amount from their credit_balance
    if (customer_id && (payment_method === 'Customer Wallet' || payment_method === 'محفظة العميل')) {
      const amtPaid = parseFloat(amount_paid) || totalAmt;
      await client.query(
        `UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2`,
        [amtPaid, customer_id]
      );
    }

    // Deduct Stock Levels and Post COGS for direct invoices if Inventory
    const parsedItems = Array.isArray(items) ? items : [];
    if ((sales_type || 'Inventory') === 'Inventory' && parsedItems.length > 0) {
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

          // Deduct Stock
          await client.query(
            "UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2",
            [qty, invItem.id]
          );

          // Post COGS
          if (cogsAmount > 0) {
            await AccountingService.recordDoubleEntry(client, {
              debitAccount: '5100',
              creditAccount: '1130',
              amount: cogsAmount,
              costCenter: 'General',
              description: `تكلفة مبيعات - صنف ${invItem.item_name} - فاتورة ${autoNum}`,
              username: req.user?.username || 'System',
              referenceNo: autoNum,
              company: company
            });
          }
        }
      }
    }

    const { rows } = await client.query(
      `INSERT INTO sales_invoices (customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes, company, created_by, salesperson_id, sales_type, commission_rate, commission_amount, payment_method, amount_paid, remaining_balance, items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [customer_id||null, autoNum, totalAmt, tax_amount||0, discount||0, due_date||null, status||'مسودة', notes, company, req.user?.username, salesperson_id||null, sales_type||'Inventory', commRate, commAmt, payment_method||'Cash', parseFloat(amount_paid)||0, parseFloat(remaining_balance)||0, JSON.stringify(parsedItems)]
    );

    const invoice = rows[0];

    // Integrate with system notifications
    try {
      const custRes = await client.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'عميل نقدي';
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'SALES_INVOICE', 'strategic', '/sales')`,
        [`فاتورة مبيعات جديدة: ${autoNum}`, `تم إصدار فاتورة مبيعات جديدة للعميل ${custName} بمبلغ ${totalAmt} EGP`]
      );
    } catch (nErr) {
      console.error("Sales invoice notification error:", nErr);
    }

    // Automatic Accounting Entry Posting
    if (status === 'مدفوعة' || status === 'مرسلة') {
      const AccountingService = require('../services/accountingService');
      const amt = parseFloat(totalAmt) || 0;
      const tax = parseFloat(tax_amount) || 0;
      const disc = parseFloat(discount) || 0;
      const baseRevenue = amt - tax + disc;

      // Debit Cash/Bank or Accounts Receivable
      const debitAcc = status === 'مدفوعة' ? '1101' : '1120'; // Cash (1101) or Receivables (1120)
      
      let revenueAccount = '4100'; // Default Sales Revenue
      if (sales_type === 'Real Estate') {
        revenueAccount = 'إيرادات مبيعات عقارية';
      } else if (sales_type === 'Service') {
        revenueAccount = 'إيرادات تقديم خدمات';
      }

      await AccountingService.recordDoubleEntry(client, {
        debitAccount: debitAcc,
        creditAccount: revenueAccount,
        amount: baseRevenue,
        costCenter: 'General',
        description: `إيراد مبيعات (${sales_type || 'Inventory'}) فاتورة رقم ${autoNum}`,
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

      // Generate Commission record
      if (salesperson_id && commAmt > 0) {
        await client.query(
          `INSERT INTO sales_commissions (salesperson_id, agent_id, sales_amount, commission_earned, payout_status, sales_type, reference_no, company)
           VALUES ($1, $1, $2, $3, 'Unpaid', $4, $5, $6)`,
          [salesperson_id, totalAmt, commAmt, sales_type || 'Inventory', autoNum, company]
        );
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
    const cf = companyWhere(req, 'sc');
    const { rows } = await pool.query(`
      SELECT sc.*, s.name AS salesperson_name 
      FROM sales_commissions sc
      LEFT JOIN staff s ON s.id = sc.salesperson_id
      WHERE 1=1 ${cf}
      ORDER BY sc.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/commissions/:id/payout', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE sales_commissions SET payout_status = 'Paid', status = 'Paid' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Commission record not found." });
    res.json({ success: true, data: rows[0] });
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

// ─── SALES QUOTATIONS (Odoo/SAP/Daftra workflow) ───────────────────────────
router.get('/quotations', async (req, res) => {
  try {
    const cf = companyWhere(req, 'q');
    const { rows } = await pool.query(`
      SELECT q.*, c.name AS customer_name
      FROM sales_quotations q
      LEFT JOIN customers c ON c.id = q.customer_id
      WHERE 1=1 ${cf}
      ORDER BY q.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/quotations', async (req, res) => {
  try {
    const { customer_id, valid_until, items, total_amount, tax_amount, discount, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const qNum = `QT-${Date.now().toString(36).toUpperCase()}`;

    const { rows } = await pool.query(
      `INSERT INTO sales_quotations (quotation_number, customer_id, valid_until, items, total_amount, tax_amount, discount, status, company, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Draft',$8,$9,$10) RETURNING *`,
      [qNum, customer_id||null, valid_until||null, JSON.stringify(items||[]), total_amount||0, tax_amount||0, discount||0, company, notes, req.user?.username]
    );

    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/quotations/:id/convert', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qId = req.params.id;

    // 1. Fetch quotation
    const qRes = await client.query("SELECT * FROM sales_quotations WHERE id = $1", [qId]);
    if (qRes.rows.length === 0) throw new Error("عرض السعر غير موجود.");
    const q = qRes.rows[0];
    if (q.status === 'Converted') throw new Error("تم تحويل عرض السعر هذا بالفعل.");

    // 2. Create Sales Order
    const soNum = `SO-${Date.now().toString(36).toUpperCase()}`;
    const { rows } = await client.query(
      `INSERT INTO sales_orders (order_number, quotation_id, customer_id, items, total_amount, tax_amount, discount, status, company, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending',$8,$9,$10) RETURNING *`,
      [soNum, q.id, q.customer_id, typeof q.items === 'string' ? q.items : JSON.stringify(q.items || []), q.total_amount, q.tax_amount, q.discount, q.company, q.notes, req.user?.username]
    );

    // 3. Update Quotation Status
    await client.query("UPDATE sales_quotations SET status = 'Converted' WHERE id = $1", [qId]);

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, link) 
       VALUES (NULL, $1, $2, 'SALES_ORDER', 'info', '/sales')`,
      [`تحويل عرض سعر إلى أمر بيع`, `تم تحويل عرض السعر ${q.quotation_number} بنجاح إلى أمر البيع ${soNum}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ─── SALES ORDERS (Odoo/SAP/Daftra workflow) ───────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const cf = companyWhere(req, 'o');
    const { rows } = await pool.query(`
      SELECT o.*, c.name AS customer_name
      FROM sales_orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE 1=1 ${cf}
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/orders', async (req, res) => {
  try {
    const { customer_id, items, total_amount, tax_amount, discount, notes, salesperson_id, sales_type, commission_rate } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const soNum = `SO-${Date.now().toString(36).toUpperCase()}`;
    const commRate = parseFloat(commission_rate) || 0;
    const totalAmt = parseFloat(total_amount) || 0;
    const commAmt = totalAmt * (commRate / 100);

    const { rows } = await pool.query(
      `INSERT INTO sales_orders (order_number, customer_id, items, total_amount, tax_amount, discount, status, company, notes, created_by, salesperson_id, sales_type, commission_rate, commission_amount)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending',$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [soNum, customer_id||null, JSON.stringify(items||[]), totalAmt, tax_amount||0, discount||0, company, notes, req.user?.username, salesperson_id||null, sales_type||'Inventory', commRate, commAmt]
    );

    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/orders/:id/invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const soId = req.params.id;

    // 1. Fetch Sales Order
    const soRes = await client.query("SELECT * FROM sales_orders WHERE id = $1", [soId]);
    if (soRes.rows.length === 0) throw new Error("أمر البيع غير موجود.");
    const so = soRes.rows[0];
    if (so.status === 'Invoiced') throw new Error("تم إصدار فاتورة لأمر البيع هذا بالفعل.");

    // 2. Create Sales Invoice (Paid by default)
    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
    const commRate = parseFloat(so.commission_rate) || 0;
    const totalAmt = parseFloat(so.total_amount) || 0;
    const commAmt = totalAmt * (commRate / 100);

    await client.query(
      `INSERT INTO sales_invoices (customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes, company, created_by, salesperson_id, sales_type, commission_rate, commission_amount)
       VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,'مدفوعة',$6,$7,$8,$9,$10,$11,$12)`,
      [so.customer_id, invNum, so.total_amount, so.tax_amount, so.discount, so.notes, so.company, req.user?.username, so.salesperson_id||null, so.sales_type||'Inventory', commRate, commAmt]
    );

    // 3. Deduct Stock Levels & Post COGS (ONLY IF Inventory)
    const AccountingService = require('../services/accountingService');
    if ((so.sales_type || 'Inventory') === 'Inventory') {
      const items = typeof so.items === 'string' ? JSON.parse(so.items) : (so.items || []);
      for (const item of items) {
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

          // Deduct Stock
          await client.query(
            "UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2",
            [qty, invItem.id]
          );

          // Post COGS
          if (cogsAmount > 0) {
            await AccountingService.recordDoubleEntry(client, {
              debitAccount: '5100',
              creditAccount: '1130',
              amount: cogsAmount,
              costCenter: 'General',
              description: `تكلفة مبيعات أمر بيع - صنف ${invItem.item_name} - فاتورة ${invNum}`,
              username: req.user?.username || 'System',
              referenceNo: invNum,
              company: so.company
            });
          }
        }
      }
    }

    // 4. Post Sales Revenue
    const taxAmt = parseFloat(so.tax_amount) || 0;
    const discAmt = parseFloat(so.discount) || 0;
    const baseRevenue = totalAmt - taxAmt + discAmt;

    let revenueAccount = '4100'; // Default Sales Revenue
    if (so.sales_type === 'Real Estate') {
      revenueAccount = 'إيرادات مبيعات عقارية';
    } else if (so.sales_type === 'Service') {
      revenueAccount = 'إيرادات تقديم خدمات';
    }

    await AccountingService.recordDoubleEntry(client, {
      debitAccount: '1101', // Cash
      creditAccount: revenueAccount,
      amount: baseRevenue,
      costCenter: 'General',
      description: `إيراد مبيعات (${so.sales_type || 'Inventory'}) أمر بيع رقم ${so.order_number}`,
      username: req.user?.username || 'System',
      referenceNo: invNum,
      company: so.company
    });

    if (taxAmt > 0) {
      await AccountingService.recordDoubleEntry(client, {
        debitAccount: '1101',
        creditAccount: '2150', // VAT
        amount: taxAmt,
        costCenter: 'General',
        description: `ضريبة القيمة المضافة لأمر بيع رقم ${so.order_number}`,
        username: req.user?.username || 'System',
        referenceNo: invNum,
        company: so.company
      });
    }

    if (discAmt > 0) {
      await AccountingService.recordDoubleEntry(client, {
        debitAccount: '4100',
        creditAccount: '1101',
        amount: discAmt,
        costCenter: 'General',
        description: `خصم مبيعات لأمر بيع رقم ${so.order_number}`,
        username: req.user?.username || 'System',
        referenceNo: invNum,
        company: so.company
      });
    }

    // 4.5 Generate Commission
    if (so.salesperson_id && commAmt > 0) {
      await client.query(
        `INSERT INTO sales_commissions (salesperson_id, agent_id, sales_amount, commission_earned, payout_status, sales_type, reference_no, company)
         VALUES ($1, $1, $2, $3, 'Unpaid', $4, $5, $6)`,
        [so.salesperson_id, totalAmt, commAmt, so.sales_type || 'Inventory', so.order_number, so.company]
      );
    }

    // 5. Update Sales Order Status
    await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [soId]);

    // Notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, link) 
       VALUES (NULL, $1, $2, 'SALES_INVOICE', 'success', '/sales')`,
      [`فوترة أمر البيع: ${so.order_number}`, `تم بنجاح فوترة وتسليم أمر البيع ${so.order_number} وإصدار الفاتورة ${invNum}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: "تمت فوترة أمر البيع وتحديث الحسابات والمخازن بنجاح!" });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});


// ─── DELIVERY NOTES ──────────────────────────────────────────────────────────
router.get('/delivery-notes', async (req, res) => {
  try {
    const cf = companyWhere(req, 'd');
    const { rows } = await pool.query(`
      SELECT d.*, c.name AS customer_name, o.order_number
      FROM sales_delivery_notes d
      LEFT JOIN customers c ON c.id = d.customer_id
      LEFT JOIN sales_orders o ON o.id = d.order_id
      WHERE 1=1 ${cf}
      ORDER BY d.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/delivery-notes', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { order_id, customer_id, warehouse, delivered_by, items, delivery_date, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const dNum = `DN-${Date.now().toString(36).toUpperCase()}`;

    const { rows } = await client.query(
      `INSERT INTO sales_delivery_notes (delivery_number, order_id, customer_id, warehouse, delivered_by, items, status, delivery_date, notes, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending',$7,$8,$9,$10) RETURNING *`,
      [dNum, order_id||null, customer_id||null, warehouse||'المخزن الرئيسي', delivered_by, JSON.stringify(items||[]), delivery_date||null, notes, company, req.user?.username]
    );

    // Update order delivery_status to In Transit
    if (order_id) {
      await client.query(`UPDATE sales_orders SET delivery_status = 'In Transit' WHERE id = $1`, [order_id]);
    }

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, link) VALUES (NULL,$1,$2,'DELIVERY_NOTE','info','/sales')`,
      [`مذكرة تسليم جديدة: ${dNum}`, `تم إنشاء مذكرة تسليم جديدة للأمر ${order_id || '—'}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

router.patch('/delivery-notes/:id/status', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { status } = req.body;
    const validStatuses = ['Pending','In Transit','Delivered','Partial','Returned'];
    if (!validStatuses.includes(status)) throw new Error('حالة غير صالحة');

    const { rows } = await client.query(
      `UPDATE sales_delivery_notes SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (rows.length === 0) throw new Error('مذكرة التسليم غير موجودة');
    const dn = rows[0];

    // If Delivered → update order delivery_status to Delivered
    if (status === 'Delivered' && dn.order_id) {
      await client.query(`UPDATE sales_orders SET delivery_status='Delivered', delivery_date=CURRENT_DATE WHERE id=$1`, [dn.order_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: dn });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── SALES RETURNS ────────────────────────────────────────────────────────────
router.get('/return-orders', async (req, res) => {
  try {
    const cf = companyWhere(req, 'r');
    const { rows } = await pool.query(`
      SELECT r.*, c.name AS customer_name, i.invoice_number
      FROM sales_return_orders r
      LEFT JOIN customers c ON c.id = r.customer_id
      LEFT JOIN sales_invoices i ON i.id = r.source_invoice_id
      WHERE 1=1 ${cf}
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/return-orders', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { source_invoice_id, source_order_id, customer_id, items, total_amount, reason, reason_code, refund_method, restock_warehouse, auto_restock, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const rNum = `RET-${Date.now().toString(36).toUpperCase()}`;

    const { rows } = await client.query(
      `INSERT INTO sales_return_orders (return_number, source_invoice_id, source_order_id, customer_id, items, total_amount, reason, reason_code, refund_method, restock_warehouse, auto_restock, status, notes, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Pending',$12,$13,$14) RETURNING *`,
      [rNum, source_invoice_id||null, source_order_id||null, customer_id||null, JSON.stringify(items||[]), total_amount||0, reason, reason_code||'CUSTOMER_REQUEST', refund_method||'Credit', restock_warehouse||'المخزن الرئيسي', auto_restock !== false, notes, company, req.user?.username]
    );
    const ret = rows[0];

    // Auto-approve and restock if auto_restock is true
    if (auto_restock !== false) {
      const parsedItems = Array.isArray(items) ? items : [];
      for (const item of parsedItems) {
        const qty = parseFloat(item.qty) || 0;
        if (qty <= 0 || !item.inventory_id) continue;
        await client.query(
          `UPDATE inventory_items SET remaining_qty = remaining_qty + $1 WHERE id = $2`,
          [qty, item.inventory_id]
        );
        await client.query(
          `INSERT INTO inventory_movements (inventory_id, movement_type, from_warehouse, to_warehouse, qty, notes, created_by)
           VALUES ($1,'Return','Customer',COALESCE($2,'المخزن الرئيسي'),$3,$4,$5)`,
          [item.inventory_id, restock_warehouse||'المخزن الرئيسي', qty, `مردود مبيعات ${rNum}`, req.user?.username]
        );
      }
      await client.query(`UPDATE sales_return_orders SET status='Approved' WHERE id=$1`, [ret.id]);

      // Post accounting reversal: Debit Sales Revenue, Credit Cash/Receivables
      const AccountingService = require('../services/accountingService');
      const totalAmt = parseFloat(total_amount) || 0;
      if (totalAmt > 0) {
        const creditAcc = refund_method === 'Cash' ? '1101' : '1120';
        await AccountingService.recordDoubleEntry(client, {
          debitAccount: '4100',   // Sales Revenue
          creditAccount: creditAcc,
          amount: totalAmt,
          costCenter: 'General',
          description: `مردود مبيعات ${rNum}`,
          username: req.user?.username || 'System',
          referenceNo: rNum,
          company
        });
      }
    }

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, link) VALUES (NULL,$1,$2,'SALES_RETURN','warning','/sales')`,
      [`مردود مبيعات: ${rNum}`, `تم تسجيل مردود مبيعات بقيمة ${total_amount || 0} EGP`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── SALES ANALYTICS DASHBOARD ───────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const cf = (!company || company === 'كل الشركات' || company.toLowerCase() === 'all')
      ? '' : ` AND company ILIKE '%${company.replace(/'/g,"''")}%'`;

    const [revenue, pipeline, topProducts, teamTargets, monthlyTrend, convRate] = await Promise.all([
      // Total revenue this month
      pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS count
        FROM sales_invoices WHERE status='مدفوعة' AND date_trunc('month',created_at)=date_trunc('month',NOW()) ${cf}`),

      // Pipeline value: quotations + orders
      pool.query(`SELECT
        COALESCE((SELECT SUM(total_amount) FROM sales_quotations WHERE status NOT IN ('Converted','Rejected') ${cf}),0) AS quotations_value,
        COALESCE((SELECT SUM(total_amount) FROM sales_orders WHERE status NOT IN ('Invoiced','Cancelled') ${cf}),0) AS orders_value,
        (SELECT COUNT(*) FROM sales_quotations WHERE 1=1 ${cf}) AS total_quotations,
        (SELECT COUNT(*) FROM sales_orders WHERE 1=1 ${cf}) AS total_orders,
        (SELECT COUNT(*) FROM sales_invoices WHERE 1=1 ${cf}) AS total_invoices,
        (SELECT COUNT(*) FROM sales_delivery_notes WHERE 1=1 ${cf}) AS total_deliveries`),

      // Top products from POS + orders (by revenue)
      pool.query(`SELECT
        elem->>'name' AS product_name,
        SUM((elem->>'qty')::numeric * (elem->>'price')::numeric) AS revenue,
        SUM((elem->>'qty')::numeric) AS qty_sold
        FROM sales_pos_transactions p, jsonb_array_elements(p.items) elem
        WHERE 1=1 ${cf}
        GROUP BY elem->>'name'
        ORDER BY revenue DESC LIMIT 8`),

      // Sales team performance
      pool.query(`SELECT agent_name, target_amount, achieved_amount, commission_rate, period
        FROM sales_targets WHERE 1=1 ${cf} ORDER BY created_at DESC LIMIT 10`),

      // Monthly revenue trend (last 6 months)
      pool.query(`WITH months AS (
          SELECT generate_series(
            date_trunc('month',NOW()) - interval '5 months',
            date_trunc('month',NOW()), interval '1 month'
          )::date AS month
        )
        SELECT to_char(m.month,'Mon YYYY') AS label,
          COALESCE(SUM(i.total_amount),0) AS revenue,
          COUNT(i.id) AS invoice_count
        FROM months m
        LEFT JOIN sales_invoices i ON date_trunc('month',i.created_at)::date = m.month
          AND i.status='مدفوعة' ${cf ? 'AND i.company ILIKE \'%' + company.replace(/'/g,"''") + '%\'' : ''}
        GROUP BY m.month ORDER BY m.month ASC`),

      // Conversion rate: quotations → orders
      pool.query(`SELECT
        COUNT(*) AS total_q,
        SUM(CASE WHEN status='Converted' THEN 1 ELSE 0 END) AS converted
        FROM sales_quotations WHERE 1=1 ${cf}`)
    ]);

    const q = convRate.rows[0];
    const conversionRate = q.total_q > 0 ? Math.round((q.converted / q.total_q) * 100) : 0;

    res.json({
      success: true,
      data: {
        revenue: revenue.rows[0],
        pipeline: pipeline.rows[0],
        topProducts: topProducts.rows,
        teamTargets: teamTargets.rows,
        monthlyTrend: monthlyTrend.rows,
        conversionRate
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── INVENTORY LOOKUP (Cross-Module Product Search) ──────────────────────────
router.get('/inventory-lookup', async (req, res) => {
  try {
    const { q = '', limit = 20, module: mod = 'all' } = req.query;
    const search = `%${q}%`;

    let items = [];

    if (mod === 'all' || mod === 'general') {
      const { rows } = await pool.query(
        `SELECT id, item_name AS name, remaining_qty AS qty, buy_price AS price,
          uom, warehouse, category, batch_no, expiry_date, 'inventory' AS source
         FROM inventory_items
         WHERE (item_name ILIKE $1 OR item_code ILIKE $1) AND remaining_qty > 0
         ORDER BY item_name LIMIT $2`,
        [search, parseInt(limit)]
      );
      items = [...items, ...rows];
    }

    res.json({ success: true, data: items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CRM INTEGRATION: Lead → Quotation ───────────────────────────────────────
router.post('/quotations/from-crm/:lead_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const leadId = req.params.lead_id;

    // Try to get lead details (CRM leads table may vary — graceful fallback)
    let lead = null;
    try {
      const leadRes = await client.query(
        `SELECT * FROM crm_leads WHERE id=$1 LIMIT 1`, [leadId]
      );
      lead = leadRes.rows[0];
    } catch (_) {}

    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const qNum = `QT-CRM-${Date.now().toString(36).toUpperCase()}`;
    const { items, notes } = req.body;

    // Try to find customer from lead
    let customerId = null;
    if (lead?.client_name || lead?.name) {
      const custRes = await client.query(
        `SELECT id FROM customers WHERE name ILIKE $1 LIMIT 1`,
        [`%${lead.client_name || lead.name}%`]
      );
      customerId = custRes.rows[0]?.id || null;
    }

    const { rows } = await client.query(
      `INSERT INTO sales_quotations (quotation_number, customer_id, source_crm_lead_id, items, total_amount, status, company, notes, created_by)
       VALUES ($1,$2,$3,$4,0,'Draft',$5,$6,$7) RETURNING *`,
      [qNum, customerId, leadId, JSON.stringify(items||[]), company, notes || (lead ? `من فرصة CRM: ${lead.client_name || lead.name || leadId}` : ''), req.user?.username]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0], message: 'تم إنشاء عرض السعر من فرصة CRM بنجاح' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── REAL ESTATE INTEGRATION: Contract → Sales Order ─────────────────────────
router.post('/orders/from-real-estate/:contract_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const contractId = req.params.contract_id;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';

    // Fetch real estate contract
    const contractRes = await client.query(
      `SELECT rc.*, ru.unit_no, ru.area, ru.price AS unit_price, rp.name AS project_name,
              c.id AS customer_id_fk
       FROM re_contracts rc
       LEFT JOIN re_units ru ON ru.id = rc.unit_id
       LEFT JOIN re_projects rp ON rp.id = ru.project_id
       LEFT JOIN customers c ON c.name ILIKE '%' || rc.client_name || '%'
       WHERE rc.id=$1 LIMIT 1`, [contractId]
    );
    if (contractRes.rows.length === 0) throw new Error('العقد العقاري غير موجود');
    const contract = contractRes.rows[0];

    const soNum = `SO-RE-${Date.now().toString(36).toUpperCase()}`;
    const items = [{
      name: `وحدة ${contract.unit_no || ''} — مشروع ${contract.project_name || ''}`,
      qty: 1,
      price: parseFloat(contract.total_value || contract.unit_price || 0)
    }];

    const { rows } = await client.query(
      `INSERT INTO sales_orders (order_number, customer_id, items, total_amount, status, source_module, company, notes, created_by)
       VALUES ($1,$2,$3,$4,'Pending','RealEstate',$5,$6,$7) RETURNING *`,
      [soNum, contract.customer_id_fk||null, JSON.stringify(items), contract.total_value||0, company,
       `من عقد عقاري رقم ${contractId} — ${contract.project_name||''}`, req.user?.username]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, link) VALUES (NULL,$1,$2,'SALES_ORDER','strategic','/sales')`,
      [`أمر بيع عقاري: ${soNum}`, `تم إنشاء أمر بيع من عقد عقاري — ${contract.project_name || ''}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;
