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

// ─── APPOINTMENTS ────────────────────────────────────────────────────────────
router.get('/appointments', async (req, res) => {
  try {
    const cf = companyWhere(req, 'a');
    const { rows } = await pool.query(`
      SELECT a.*, c.name AS customer_name, c.company_name AS customer_company
      FROM crm_appointments a
      LEFT JOIN customers c ON c.id = a.customer_id
      WHERE 1=1 ${cf}
      ORDER BY a.appointment_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

router.post('/appointments', async (req, res) => {
  try {
    const { customer_id, title, appointment_date, duration_minutes, status, notes, assigned_to } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO crm_appointments (customer_id, title, appointment_date, duration_minutes, status, notes, assigned_to, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [customer_id || null, title, appointment_date, duration_minutes || 60, status || 'مجدول', notes, assigned_to, company, req.user?.username]
    );

    // Trigger Notification & Alert Integration
    try {
      let assignedUser = null;
      if (assigned_to) {
        const uRes = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [assigned_to.trim()]);
        if (uRes.rows.length > 0) {
          assignedUser = uRes.rows[0].id;
        }
      }
      
      const custRes = await pool.query('SELECT name FROM customers WHERE id = $1', [customer_id]);
      const custName = custRes.rows[0]?.name || 'غير محدد';
      
      if (assignedUser) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, severity, link) 
           VALUES ($1, $2, $3, 'CRM_APPOINTMENT', 'strategic', '/crm')`,
          [assignedUser, 'موعد عميل جديد مسند إليك', `تم جدولة موعد للعميل ${custName} بعنوان: ${title} بتاريخ ${appointment_date}`]
        );
      }
      
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, severity, link) 
         VALUES (NULL, $1, $2, 'CRM_APPOINTMENT', 'strategic', '/crm')`,
        ['موعد عميل جديد في النظام', `تم جدولة موعد جديد للعميل ${custName} بعنوان (${title}) مسند إلى (${assigned_to || 'غير محدد'})`]
      );
    } catch (nErr) {
      console.error("CRM notification error:", nErr);
    }

    res.json({ success: true, data: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ─── MEMBERSHIP PLANS ────────────────────────────────────────────────────────
router.get('/membership-plans', async (req, res) => {
  try {
    const cf = companyWhere(req);
    const { rows } = await pool.query(`SELECT * FROM crm_membership_plans WHERE 1=1 ${cf} ORDER BY id DESC`);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/membership-plans', async (req, res) => {
  try {
    const { name, duration_days, price, sessions_included, description } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO crm_membership_plans (name, duration_days, price, sessions_included, description, company)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, duration_days || 30, price || 0, sessions_included || 0, description, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── MEMBERSHIPS ─────────────────────────────────────────────────────────────
router.get('/memberships', async (req, res) => {
  try {
    const cf = companyWhere(req, 'm');
    const { rows } = await pool.query(`
      SELECT m.*, c.name AS customer_name, p.name AS plan_name, p.sessions_included
      FROM crm_memberships m
      LEFT JOIN customers c ON c.id = m.customer_id
      LEFT JOIN crm_membership_plans p ON p.id = m.plan_id
      WHERE 1=1 ${cf}
      ORDER BY m.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/memberships', async (req, res) => {
  try {
    const { customer_id, plan_id, start_date, end_date, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    let finalEnd = end_date;
    if (!finalEnd && plan_id) {
      const planRes = await pool.query('SELECT duration_days FROM crm_membership_plans WHERE id = $1', [plan_id]);
      if (planRes.rows.length > 0) {
        const d = new Date(start_date || new Date());
        d.setDate(d.getDate() + (planRes.rows[0].duration_days || 30));
        finalEnd = d.toISOString().slice(0, 10);
      }
    }
    const { rows } = await pool.query(
      `INSERT INTO crm_memberships (customer_id, plan_id, start_date, end_date, notes, company)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customer_id, plan_id || null, start_date, finalEnd, notes, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POINTS & CREDITS ────────────────────────────────────────────────────────
router.get('/points', async (req, res) => {
  try {
    const cf = companyWhere(req, 'p');
    const { rows } = await pool.query(`
      SELECT p.*, c.name AS customer_name
      FROM crm_points p
      LEFT JOIN customers c ON c.id = p.customer_id
      WHERE 1=1 ${cf}
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/points', async (req, res) => {
  try {
    const { customer_id, points, type, notes } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO crm_points (customer_id, points, type, notes, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customer_id, points || 0, type || 'إضافة', notes, company, req.user?.username]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CLIENT ATTENDANCE ───────────────────────────────────────────────────────
router.get('/client-attendance', async (req, res) => {
  try {
    const { date } = req.query;
    const cf = companyWhere(req, 'a');
    let dateClause = '';
    if (date) dateClause = ` AND DATE(a.check_in) = '${date}'`;
    const { rows } = await pool.query(`
      SELECT a.*, c.name AS customer_name
      FROM crm_client_attendance a
      LEFT JOIN customers c ON c.id = a.customer_id
      WHERE 1=1 ${cf} ${dateClause}
      ORDER BY a.check_in DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/client-attendance', async (req, res) => {
  try {
    const { customer_id, check_in, notes, visit_type } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    const { rows } = await pool.query(
      `INSERT INTO crm_client_attendance (customer_id, check_in, notes, visit_type, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customer_id, check_in || new Date().toISOString(), notes, visit_type || 'زيارة عادية', company, req.user?.username]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/client-attendance/:id/checkout', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE crm_client_attendance SET check_out = NOW() WHERE id = $1 RETURNING *`, [req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SALES CROSS-MODULE: CRM Lead → Sales Quotation ──────────────────────────
router.post('/leads/:id/to-quotation', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const leadId = req.params.id;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';

    // Try to get lead from crm_leads (soft fallback if table doesn't exist)
    let lead = null;
    try {
      const lr = await client.query(`SELECT * FROM crm_leads WHERE id=$1 LIMIT 1`, [leadId]);
      lead = lr.rows[0];
    } catch (_) {}

    // Try to match customer
    let customerId = null;
    if (lead?.client_name || lead?.name) {
      const cr = await client.query(
        `SELECT id FROM customers WHERE name ILIKE $1 LIMIT 1`,
        [`%${(lead.client_name || lead.name).trim()}%`]
      );
      customerId = cr.rows[0]?.id || null;
    }

    const qNum = `QT-CRM-${Date.now().toString(36).toUpperCase()}`;
    const { items = [], notes } = req.body;

    const { rows } = await client.query(
      `INSERT INTO sales_quotations (quotation_number, customer_id, source_crm_lead_id, items, total_amount, status, company, notes, created_by)
       VALUES ($1,$2,$3,$4,0,'Draft',$5,$6,$7) RETURNING *`,
      [qNum, customerId, leadId, JSON.stringify(items), company,
       notes || (lead ? `من فرصة CRM: ${lead.client_name || lead.name || leadId}` : `من CRM Lead #${leadId}`),
       req.user?.username]
    );

    // Notify
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, severity, link) VALUES (NULL,$1,$2,'SALES_QUOTATION','info','/sales')`,
      [`عرض سعر من CRM: ${qNum}`, `تم إنشاء عرض سعر جديد من فرصة CRM رقم ${leadId}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0], quotation_number: qNum });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

// ─── SALES CROSS-MODULE: CRM Member → Auto Sales Invoice ─────────────────────
router.post('/memberships/:id/create-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const membershipId = req.params.id;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';

    const { rows: mRows } = await client.query(
      `SELECT m.*, c.id AS customer_fk, c.name AS customer_name, p.name AS plan_name, p.price AS plan_price
       FROM crm_memberships m
       LEFT JOIN customers c ON c.id = m.customer_id
       LEFT JOIN crm_membership_plans p ON p.id = m.plan_id
       WHERE m.id = $1 LIMIT 1`, [membershipId]
    );
    if (mRows.length === 0) throw new Error('الاشتراك غير موجود');
    const m = mRows[0];

    const invNum = `INV-MEM-${Date.now().toString(36).toUpperCase()}`;
    const { rows } = await client.query(
      `INSERT INTO sales_invoices (customer_id, invoice_number, total_amount, tax_amount, discount, due_date, status, notes, company, created_by)
       VALUES ($1,$2,$3,0,0,CURRENT_DATE,'مدفوعة',$4,$5,$6) RETURNING *`,
      [m.customer_fk || null, invNum, m.plan_price || 0,
       `فاتورة اشتراك ${m.plan_name || ''} — عضو: ${m.customer_name || ''}`,
       company, req.user?.username]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0], invoice_number: invNum });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;
