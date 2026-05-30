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

// ─── CRM LEADS CRUD ──────────────────────────────────────────────────────────
router.get('/leads', async (req, res) => {
  try {
    const cf = companyWhere(req, 'l');
    const { rows } = await pool.query(`
      SELECT l.*, 
             p.name AS preferred_project_name, 
             u.unit_number AS preferred_unit_number, 
             u.price AS preferred_unit_price,
             u.status AS preferred_unit_status
      FROM crm_leads l
      LEFT JOIN real_estate_projects p ON p.id = l.preferred_project_id
      LEFT JOIN real_estate_units u ON u.id = l.preferred_unit_id
      WHERE 1=1 ${cf}
      ORDER BY l.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leads', async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, source, status, assigned_to, preferred_project_id, preferred_unit_id, budget, hold_hours } = req.body;
    const company = req.selectedCompany || req.headers['x-selected-company'] || '';
    
    let hold_expires_at = null;
    if (preferred_unit_id && hold_hours) {
      hold_expires_at = new Date();
      hold_expires_at.setHours(hold_expires_at.getHours() + parseInt(hold_hours));
      
      // Reserve the unit temporarily
      await pool.query("UPDATE real_estate_units SET status = 'Reserved' WHERE id = $1 AND status = 'Available'", [preferred_unit_id]);
    }

    const { rows } = await pool.query(
      `INSERT INTO crm_leads (company_name, contact_person, email, phone, source, status, assigned_to, preferred_project_id, preferred_unit_id, budget, hold_expires_at, company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [company_name, contact_person, email, phone, source || 'Web', status || 'New', assigned_to, preferred_project_id || null, preferred_unit_id || null, budget || 0, hold_expires_at, company]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, contact_person, email, phone, source, status, assigned_to, preferred_project_id, preferred_unit_id, budget, lead_score } = req.body;
    
    const { rows } = await pool.query(
      `UPDATE crm_leads 
       SET company_name=$1, contact_person=$2, email=$3, phone=$4, source=$5, status=$6, assigned_to=$7, preferred_project_id=$8, preferred_unit_id=$9, budget=$10, lead_score=$11
       WHERE id=$12 RETURNING *`,
      [company_name, contact_person, email, phone, source, status, assigned_to, preferred_project_id || null, preferred_unit_id || null, budget, lead_score || 50, id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Release unit hold if exists
    const leadRes = await pool.query("SELECT preferred_unit_id FROM crm_leads WHERE id = $1", [id]);
    if (leadRes.rows.length > 0 && leadRes.rows[0].preferred_unit_id) {
      await pool.query("UPDATE real_estate_units SET status = 'Available' WHERE id = $1 AND status = 'Reserved'", [leadRes.rows[0].preferred_unit_id]);
    }
    await pool.query("DELETE FROM crm_leads WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── LEAD INTERACTIONS ───────────────────────────────────────────────────────
router.get('/leads/:id/interactions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM crm_interactions WHERE lead_id = $1 ORDER BY interaction_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leads/:id/interactions', async (req, res) => {
  try {
    const { type, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO crm_interactions (lead_id, type, notes, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, type || 'Note', notes, req.user?.username || 'System']
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AI FOLLOW-UP CO-PILOT ───────────────────────────────────────────────────
router.post('/leads/:id/ai-suggest', async (req, res) => {
  try {
    const { id } = req.params;
    const leadRes = await pool.query(`
      SELECT l.*, p.name AS project_name, u.unit_number, u.price
      FROM crm_leads l
      LEFT JOIN real_estate_projects p ON p.id = l.preferred_project_id
      LEFT JOIN real_estate_units u ON u.id = l.preferred_unit_id
      WHERE l.id = $1
    `, [id]);

    if (leadRes.rows.length === 0) return res.status(404).json({ error: 'العميل المحتمل غير موجود' });
    const lead = leadRes.rows[0];

    const prompt = `You are an expert Real Estate Sales Consultant. Write a polite, engaging, and professional follow-up message to a client who is a lead for a property.
Lead details:
- Name: ${lead.contact_person}
- Company: ${lead.company_name || 'Individual'}
- Preferred Project: ${lead.project_name || 'N/A'}
- Preferred Unit: ${lead.unit_number || 'N/A'}
- Unit Price: ${lead.price || 'N/A'} EGP
- Current Status: ${lead.status}
- Interaction Notes: (Needs prompt follow up regarding property purchase).

Write a short, professional response in both Arabic and English that can be sent over WhatsApp. Keep it concise.`;

    const axios = require('axios');
    let aiResponse = "";
    try {
      const response = await axios.post('http://127.0.0.1:4040/v1/chat/completions', {
        model: 'qwen2.5-coder:32b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }, { timeout: 3000 });
      aiResponse = response.data?.choices?.[0]?.message?.content || "";
    } catch (aiErr) {
      console.warn("AI Proxy offline, falling back to static templates.");
      aiResponse = `مرحباً ${lead.contact_person}، نود متابعة اهتمامكم بالوحدة ${lead.unit_number || ''} بمشروع ${lead.project_name || ''}. هل يناسبكم موعد غداً لمناقشة التفاصيل؟\n\nHello ${lead.contact_person}, we are following up on your interest in unit ${lead.unit_number || ''} at ${lead.project_name || ''}. Would you be free for a call tomorrow?`;
    }

    res.json({ success: true, suggestion: aiResponse });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CRM CONVERT LEAD TO REAL ESTATE CONTRACT ────────────────────────────────
router.post('/leads/:id/book-unit', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { down_payment, installment_years, contract_date, frequency } = req.body;
    const username = req.user?.username || 'System';

    // 1. Get lead details
    const leadRes = await client.query(`SELECT * FROM crm_leads WHERE id = $1 FOR UPDATE`, [id]);
    if (leadRes.rows.length === 0) throw new Error('العميل المحتمل غير موجود');
    const lead = leadRes.rows[0];

    if (!lead.preferred_unit_id) throw new Error('يرجى تحديد وحدة مفضلة أولاً لحجزها');

    // 2. Resolve/Create Customer in central table
    let customerId = null;
    const custCheck = await client.query("SELECT id FROM customers WHERE LOWER(phone) = LOWER($1) OR name ILIKE $2", [lead.phone?.trim(), `%${lead.contact_person?.trim()}%`]);
    
    if (custCheck.rows.length > 0) {
      customerId = custCheck.rows[0].id;
    } else {
      const activeComp = lead.company || '';
      let resolvedCompanyId = 1;
      let resolvedCompanyName = 'TED CAPITAL';
      if (activeComp.toLowerCase().includes('design')) { resolvedCompanyId = 2; resolvedCompanyName = 'Design Concept'; }
      else if (activeComp.toLowerCase().includes('master')) { resolvedCompanyId = 3; resolvedCompanyName = 'Master Builder'; }
      
      const insertCust = await client.query(
        `INSERT INTO customers (name, phone, email, company, company_id, customer_type)
         VALUES ($1, $2, $3, $4, $5, 'Real Estate') RETURNING id`,
        [lead.contact_person, lead.phone, lead.email, resolvedCompanyName, resolvedCompanyId]
      );
      customerId = insertCust.rows[0].id;
    }

    // 3. Get Unit Details
    const unitRes = await client.query(`
      SELECT u.*, p.name as project_name 
      FROM real_estate_units u 
      JOIN real_estate_projects p ON u.project_id = p.id 
      WHERE u.id = $1 FOR UPDATE`, [lead.preferred_unit_id]);
    if (unitRes.rows.length === 0) throw new Error("الوحدة غير موجودة");
    const unit = unitRes.rows[0];
    if (unit.status !== 'Available' && unit.status !== 'Reserved') throw new Error("الوحدة غير متاحة للبيع");

    // 4. Update Unit & Lead status
    await client.query("UPDATE real_estate_units SET status = 'Sold' WHERE id = $1", [lead.preferred_unit_id]);
    await client.query("UPDATE crm_leads SET status = 'Qualified', lead_score = 100 WHERE id = $1", [id]);

    // 5. Create Contract
    const totalPrice = parseFloat(unit.price || 0);
    const contractRes = await client.query(
        `INSERT INTO real_estate_contracts (unit_id, customer_id, customer_name, total_price, down_payment, installment_years, contract_date, project_name, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [lead.preferred_unit_id, customerId, lead.contact_person, totalPrice, down_payment || 0, installment_years || 1, contract_date || new Date().toISOString(), unit.project_name, username]
    );
    const contractId = contractRes.rows[0].id;

    // 6. Generate Installments
    let monthStep = frequency === 'Quarterly' ? 3 : (frequency === 'Semi-Annual' ? 6 : (frequency === 'Annual' ? 12 : 1));
    let numPayments = Math.floor(((installment_years || 1) * 12) / monthStep);
    const remainingValue = totalPrice - parseFloat(down_payment || 0);
    const amountPer = (remainingValue / numPayments).toFixed(2);
    let currDate = new Date(contract_date || new Date());

    for (let i = 1; i <= numPayments; i++) {
        await client.query(
            "INSERT INTO real_estate_installments (contract_id, installment_no, due_date, amount, status) VALUES ($1, $2, $3, $4, 'Pending')",
            [contractId, i.toString(), currDate.toISOString(), amountPer]
        );
        currDate.setMonth(currDate.getMonth() + monthStep);
    }

    // 7. Commissions Recording
    if (lead.assigned_to) {
      const staffRes = await client.query("SELECT id FROM staff WHERE name ILIKE $1 LIMIT 1", [`%${lead.assigned_to}%`]);
      if (staffRes.rows.length > 0) {
        const commAmt = (totalPrice * 0.015).toFixed(2); // Auto 1.5% commission
        await client.query(
          `INSERT INTO sales_commissions (staff_id, source_type, source_id, amount, status) 
           VALUES ($1, 'RealEstate', $2, $3, 'Pending')`,
          [staffRes.rows[0].id, contractId, commAmt]
        );
      }
    }

    // 8. Accounting Postings
    const AccountingService = require('../services/accountingService');
    const revenueDesc = `مبيعات عقارية تحويل من CRM - عقد #${contractId} - وحدة ${unit.unit_number} - عميل: ${lead.contact_person}`;
    
    await AccountingService.recordDoubleEntry(client, {
        debitAccount: 'عملاء (حسابات مدينة - AR)',
        creditAccount: 'إيرادات مبيعات عقارية',
        amount: totalPrice,
        costCenter: unit.project_name,
        description: revenueDesc,
        username: username
    });

    if (parseFloat(down_payment || 0) > 0) {
        const dpDesc = `مقدم حجز تحويل من CRM - عقد #${contractId} - وحدة ${unit.unit_number} - عميل: ${lead.contact_person}`;
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: 'صندوق نقدية - تيد كابيتال',
            creditAccount: 'عملاء (حسابات مدينة - AR)',
            amount: parseFloat(down_payment),
            costCenter: unit.project_name,
            description: dpDesc,
            username: username
        });
    }

    await client.query('COMMIT');
    res.json({ success: true, contractId, message: "تم تحويل العميل المحتمل لعقد بيع بنجاح وتوليد الأقساط والقيود المالية!" });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally { client.release(); }
});

module.exports = router;

