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

module.exports = router;
