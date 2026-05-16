// TED CAPITAL ERP - API Routes
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const geolib = require('geolib');
const express = require('express');
const pool = require('../config/db');
const { upload } = require('../config/storage');

// 🌟 التعديل الأول: استيراد المساعدات بدون autoLedgerEntry لمنع انهيار "General" و "مصاريف"
const { cleanNumeric, logAudit, logAdvancedAudit, syncProjectFinancials, calculateMovingAverage } = require('../utils/helpers');
const { sendEmailNotification, checkAndSendLowStockEmail } = require('../config/mailer');

// 🌟 استيراد الصلاحيات (يتم مرة واحدة فقط لتجنب خطأ Identifier has already been declared)
const { hasAccess, requireAdmin, authenticateToken } = require('../middlewares/auth');
const { authGuard, checkPermission } = require('../middlewares/authMiddleware');

// ============================================================================
// 🌟 صمام الأمان المالي (Local GL Wrapper): تم نقله لـ AccountingService (محرك القيود المحاسبية)
// ============================================================================
const AccountingService = require('../services/accountingService');

// Controllers
const purchaseController = require('../controllers/purchaseController');
const salesController = require('../controllers/salesController');
const payrollController = require('../controllers/payrollController');
const realEstateController = require('../controllers/realEstateController');
const partnerController = require('../controllers/partnerController');

async function autoLedgerEntry(client, accountIdentifier, costCenter, debit, credit, description, username) {
    try {
        await AccountingService.logEntry(client, accountIdentifier, costCenter, debit, credit, description, username);
    } catch (err) {
        console.error("🔥 خطأ في توليد القيد المحاسبي الآلي:", err.message);
        // لا نقوم بعمل throw لكي لا نوقف العملية الأساسية وتستمر الدورة المستندية
    }
}

// 🌟 تحديث: استيراد محرك مسارات العمل (Workflow Engine) وموزع الإشعارات (Webhook Dispatcher)
// تم استخدام try/catch لضمان عمل النظام بدون توقف لحين كتابة وإنشاء هذه الملفات في الخطوة القادمة
let processApprovalWorkflow = async () => ({ newStatus: 'اعتماد مالي', isFinalApproval: true });
let dispatchWebhook = () => { };
try {
    processApprovalWorkflow = require('../services/workflowEngine').processApprovalWorkflow;
    dispatchWebhook = require('../services/webhookDispatcher').dispatchWebhook;
} catch (e) {
    console.warn("Workflow or Webhook services not found yet. Using graceful fallbacks.");
}

const router = express.Router();

router.get('/iam-test', (req, res) => res.json({ message: "IAM Routes are reachable" }));

router.get('/dropdowns', async (req, res) => {
    try {
        // 🌟 [Elite Stabilization] Schema fixes and seeding moved to startup.

        // =========================================================================

        const projects = await pool.query("SELECT id, name FROM projects");
        const staff = await pool.query("SELECT name, salary FROM staff");
        const subs = await pool.query("SELECT id, name FROM subcontractors");
        const accs = await pool.query("SELECT account_name FROM chart_of_accounts");
        const custs = await pool.query("SELECT id, name, company_name, phone, legal_id, customer_type, referral, customer_since, product FROM customers");
        const units = await pool.query("SELECT value FROM system_parameters WHERE category='Unit'");
        const paramProjects = await pool.query("SELECT id, value FROM system_parameters WHERE category='Project'");
        const committees = await pool.query("SELECT id, name FROM committees");
        const orgUnits = await pool.query("SELECT id, name, type FROM org_units");

        const projectComps = await pool.query("SELECT DISTINCT company FROM projects WHERE company IS NOT NULL AND company != ''");
        const staffComps = await pool.query("SELECT DISTINCT company FROM staff WHERE company IS NOT NULL AND company != ''");
        const rfqComps = await pool.query("SELECT DISTINCT company FROM rfq WHERE company IS NOT NULL AND company != ''");
        const poComps = await pool.query("SELECT DISTINCT supplier AS company FROM purchase_orders WHERE supplier IS NOT NULL AND supplier != ''");
        const jobTitles = await pool.query("SELECT DISTINCT job_title FROM staff WHERE job_title IS NOT NULL AND job_title != ''");
        const roles = await pool.query("SELECT id, name FROM roles ORDER BY name ASC");
        const staffList = await pool.query("SELECT id, name, job_title FROM staff ORDER BY name ASC");

        const allCompanies = [...new Set([
            ...projectComps.rows.map(r => r.company),
            ...staffComps.rows.map(r => r.company),
            ...rfqComps.rows.map(r => r.company),
            ...poComps.rows.map(r => r.company)
        ])];

        const allProjects = [...new Set([...projects.rows.map(r => r.name), ...paramProjects.rows.map(r => r.value)])];
        const allProjectsData = projects.rows;

        const instsQuery = `SELECT i.id, i.contract_id, i.installment_no, i.amount, i.due_date, i.status,
                (SELECT COALESCE(SUM(amount), 0) FROM payment_receipts WHERE installment_id = i.id) as total_paid
                FROM installments i`;
        const installments = await pool.query(instsQuery);

        const instsWithStatus = installments.rows.map(i => {
            let dynStatus = i.status;
            const paid = parseFloat(i.total_paid);
            const amt = parseFloat(i?.amount || 0);
            if (i.status === 'Paid' || paid >= amt) dynStatus = 'Paid';
            else if (paid > 0 && paid < amt) dynStatus = 'Partial';
            else if (new Date(i.due_date) < new Date() && i.status !== 'Paid') dynStatus = 'Due';
            return { ...i, dynamic_status: dynStatus };
        });

        res.json({
            projects_dd: allProjectsData,
            projects: allProjects,
            param_projects: paramProjects.rows,
            staff_dd: staff.rows,
            staff_full_dd: staffList.rows,
            roles_dd: roles.rows,
            subcontractors_dd: subs.rows,
            accounts_dd: accs.rows.map(r => r.account_name),
            customers_dd: custs.rows,
            system_units: units.rows.map(r => r.value),
            companies_dd: allCompanies,
            project_companies_dd: projectComps.rows.map(r => r.company),
            job_titles_dd: jobTitles.rows.map(r => r.job_title),
            installments_dd: instsWithStatus
        });
    } catch (err) {
        console.error("[API ERROR] GET /dropdowns:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const query = "SELECT id, username, email, role, status, permissions, full_name, phone, department, employee_id, linked_employee_id, two_factor, created_at FROM users ORDER BY id ASC";
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Users Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/table/users', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, role, status, permissions, full_name, phone, department, employee_id, linked_employee_id, two_factor, created_at FROM users ORDER BY id ASC");
        res.json({ data: result.rows, total: result.rows.length });
    } catch (err) {
        console.error("Users Table Fetch Error:", err);
        res.status(500).json({ error: err.message, total: 0 });
    }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
    const { username, email, password, role, status, permissions, full_name, phone, department, employee_id, linked_employee_id, two_factor } = req.body;
    try {
        const bcrypt = require('bcryptjs');
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4, status=$5, permissions=$6, full_name=$7, phone=$8, department=$9, employee_id=$10, linked_employee_id=$11, two_factor=$12 WHERE id=$13", [username, email, hash, role, status, JSON.stringify(permissions || {}), full_name, phone, department, employee_id, linked_employee_id, two_factor, req.params.id]);
        } else {
            await pool.query("UPDATE users SET username=$1, email=$2, role=$3, status=$4, permissions=$5, full_name=$6, phone=$7, department=$8, employee_id=$9, linked_employee_id=$10, two_factor=$11 WHERE id=$12", [username, email, role, status, JSON.stringify(permissions || {}), full_name, phone, department, employee_id, linked_employee_id, two_factor, req.params.id]);
        }
        await logAudit(req.user.username, 'UPDATE_USER', 'users', req.params.id, `Updated user ${username}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
        await logAudit(req.user.username, 'DELETE_USER', 'users', req.params.id, `Deleted user ID ${req.params.id}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/system_parameters/:category', requireAdmin, async (req, res) => {
    try {
        const cat = req.params.category.charAt(0).toUpperCase() + req.params.category.slice(1);
        await pool.query("INSERT INTO system_parameters (category, value) VALUES ($1, $2)", [cat, req.body.value]);
        res.json({ success: true });
    } catch (err) {
        console.error("[API ERROR] POST /system_parameters:", err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/system_parameters/:category/:val', requireAdmin, async (req, res) => {
    try {
        const cat = req.params.category.charAt(0).toUpperCase() + req.params.category.slice(1);
        await pool.query("DELETE FROM system_parameters WHERE category=$1 AND value=$2", [cat, req.params.val]);
        res.json({ success: true });
    } catch (err) {
        console.error("[API ERROR] DELETE /system_parameters:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/system/backups', requireAdmin, async (req, res) => {
    try {
        const backups = await pool.query("SELECT * FROM backups_log ORDER BY id DESC");
        res.json({ success: true, data: backups.rows });
    } catch (err) {
        console.error("[API ERROR] GET /system/backups:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/system/backup/manual', requireAdmin, async (req, res) => {
    try {
        const { getPgExe, getDbUrl } = require('../utils/helpers');
        const { exec } = require('child_process');
        const path = require('path');
        const backupFile = `backup_manual_${Date.now()}.sql`;
        const bPath = path.join(__dirname, '../../uploads');
        const filePath = path.join(bPath, backupFile);

        const cmd = `${getPgExe('pg_dump')} --dbname="${getDbUrl()}" -F c -f "${filePath}"`;

        exec(cmd, async (err) => {
            if (err) {
                console.error("[BACKUP ERROR] Dump failed:", err);
            } else {
                await pool.query("INSERT INTO backups_log (name, size, source) VALUES ($1, 'Unknown', 'Manual')", [backupFile]);
            }
        });
        res.json({ success: true, message: 'Backup initiated successfully', file: backupFile });
    } catch (err) {
        console.error("[API ERROR] POST /system/backup/manual:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/system/backup_config', requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM system_parameters WHERE category IN ('BackupLink', 'BackupLocalDirectory')");
        await pool.query("INSERT INTO system_parameters (category, value) VALUES ('BackupLink', $1)", [req.body.link || '']);
        await pool.query("INSERT INTO system_parameters (category, value) VALUES ('BackupLocalDirectory', $1)", [req.body.local_directory || '']);
        res.json({ success: true });
    } catch (e) {
        console.error("[API ERROR] POST /system/backup_config:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/action/create_preorder', async (req, res) => {
    const { client_id, po_id, reserved_qty, unit_price, advance_payment } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const poCheck = await client.query("SELECT qty FROM purchase_orders WHERE id = $1", [po_id]);
        if (poCheck.rows.length === 0) throw new Error("أمر الشراء غير موجود.");
        const poQty = parseFloat(poCheck.rows[0].qty || 0);

        const reservedCheck = await client.query("SELECT SUM(reserved_qty) as total_reserved FROM client_preorders WHERE po_id = $1 AND status != 'Cancelled'", [po_id]);
        const alreadyReserved = parseFloat(reservedCheck.rows[0].total_reserved || 0);
        const requestedQty = parseFloat(reserved_qty || 0);

        if ((alreadyReserved + requestedQty) > poQty) {
            throw new Error(`الكمية المطلوبة غير متوفرة. المتاح للحجز: ${poQty - alreadyReserved}`);
        }

        const insertPreOrderQuery = `
            INSERT INTO client_preorders (client_id, po_id, reserved_qty, unit_price, advance_payment, status) 
            VALUES ($1, $2, $3, $4, $5, 'Pending')
        `;
        await client.query(insertPreOrderQuery, [client_id, po_id, reserved_qty, unit_price, advance_payment]);

        const mappingRes = await client.query(
            `SELECT debit_account, credit_account FROM gl_mappings WHERE transaction_type = 'CLIENT_ADVANCE'`
        );

        let debitAcc = 'صندوق نقدية - تيد كابيتال';
        let creditAcc = 'دفعات مقدمة من العملاء';
        if (mappingRes.rows.length > 0) {
            debitAcc = mappingRes.rows[0].debit_account;
            creditAcc = mappingRes.rows[0].credit_account;
        }

        const journalDesc = `دفعة مقدمة من عميل رقم ${client_id} لحجز بضاعة من PO رقم ${po_id}`;

        await autoLedgerEntry(client, debitAcc, 'General', advance_payment, 0, journalDesc, req.user ? req.user.username : 'System-Preorder');
        await autoLedgerEntry(client, creditAcc, 'General', 0, advance_payment, journalDesc, req.user ? req.user.username : 'System-Preorder');

        await client.query('COMMIT');

        if (req.body.recipient && req.body.subject) {
            await sendEmailNotification(req.body.recipient, req.body.subject, req.body.body, true);
        }

        res.json({ success: true, message: "تم تسجيل الحجز وإنشاء القيد المحاسبي بنجاح." });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating pre-order:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

router.post('/action/approve_sub_invoice/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const invoiceId = req.params.id;
        const { action, username } = req.body;

        // 🌟 أمان قوي: جلب صلاحية المستخدم من التوكن المشفر وليس من الواجهة (Body)
        const userRole = req.user ? req.user.role : 'Unknown';

        const invRes = await client.query("SELECT * FROM subcontractor_invoices WHERE id = $1", [invoiceId]);
        if (invRes.rows.length === 0) throw new Error("Invoice not found.");
        const invoice = invRes.rows[0];

        // 🌟 استدعاء محرك مسارات العمل الديناميكي بدلاً من الشروط الثابتة 🌟
        // المحرك سيتحقق من قيم الفاتورة لتحديد هل تحتاج موافقة مدير عام أم لا
        const workflowResult = await processApprovalWorkflow('subcontractor_invoices', invoice, action, userRole, parseFloat(invoice.net_amount));
        const newStatus = workflowResult.newStatus;

        // إذا كان هذا هو الاعتماد النهائي والأخير في مسار العمل (Final Step)
        if (workflowResult.isFinalApproval) {
            const netAmount = parseFloat(invoice.net_amount);
            const projectName = invoice.project_name || 'General';
            const desc = `اعتماد مستخلص مقاول باطن رقم #${invoiceId} - ${invoice.description}`;

            await autoLedgerEntry(client, 'مقاولي الباطن', projectName, 0, netAmount, desc, username);
            await autoLedgerEntry(client, 'تكلفة مقاولي الباطن', projectName, netAmount, 0, desc, username);

            await client.query(
                "UPDATE boq SET dynamic_act_qty = COALESCE(dynamic_act_qty, 0) + $1 WHERE id = $2",
                [invoice.curr_qty, invoice.sub_item_id]
            );
        }

        await client.query("UPDATE subcontractor_invoices SET status = $1 WHERE id = $2", [newStatus, invoiceId]);

        // تسجيل القيمة القديمة والجديدة في سجل التدقيق المطور
        await logAdvancedAudit(client, username, 'subcontractor_invoices', invoiceId, 'Approval Workflow', `Status changed to ${newStatus}`, invoice, { ...invoice, status: newStatus });

        await client.query('COMMIT');

        // 🌟 إرسال إشعار Webhook للأنظمة الخارجية (مثل رسالة للمقاول) عند الاعتماد النهائي
        if (workflowResult.isFinalApproval) {
            dispatchWebhook('invoice_approved', { invoiceId, newStatus, amount: invoice.net_amount, project: invoice.project_name });
        }

        res.json({ success: true, newStatus });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.get('/subcontractor_items/:sub_id', async (req, res) => {
    try {
        const items = await pool.query("SELECT * FROM subcontractor_items WHERE subcontractor_id = $1", [req.params.sub_id]);
        res.json({ data: items.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/inventory_usage_history', async (req, res) => {
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

router.get('/portal/client_dashboard/:client_id', async (req, res) => {
    try {
        const clientId = req.params.client_id;
        const clientRes = await pool.query("SELECT name, phone, email, credit_balance FROM customers WHERE id = $1", [clientId]);
        if (clientRes.rows.length === 0) return res.status(404).json({ error: "Client not found" });

        const contractsRes = await pool.query("SELECT contract_type, project_name, unit_number, total_value FROM contracts WHERE customer_name = $1", [clientRes.rows[0].name]);
        const dueInstRes = await pool.query("SELECT installment_no, amount, due_date FROM installments WHERE client_id = $1 AND status != 'Paid' ORDER BY due_date ASC LIMIT 5", [clientId]);
        const delayedRes = await pool.query("SELECT amount, due_date FROM client_delayed_payments WHERE client_id = $1 AND status != 'Paid'", [clientId]);

        res.json({
            success: true,
            profile: clientRes.rows[0],
            contracts: contractsRes.rows,
            upcoming_installments: dueInstRes.rows,
            delayed_debts: delayedRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/boq_subcontractors/:boq_id', async (req, res) => {
    try {
        const subs = await pool.query(`SELECT si.*, s.name as sub_name FROM subcontractor_items si LEFT JOIN subcontractors s ON si.subcontractor_id = s.id WHERE si.boq_id = $1`, [req.params.boq_id]);
        res.json({ data: subs.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/boq_invoices/:boq_id', async (req, res) => {
    try {
        const invs = await pool.query(`SELECT i.*, s.name as sub_name FROM subcontractor_invoices i LEFT JOIN subcontractors s ON i.subcontractor_id = s.id WHERE i.sub_item_id IN (SELECT id FROM subcontractor_items WHERE boq_id = $1)`, [req.params.boq_id]);
        res.json({ data: invs.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/attachments/:table/:id', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM attachments WHERE table_name=$1 AND record_id=$2", [req.params.table, req.params.id]);
        res.json({ files: r.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/delete_attachment/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM attachments WHERE id=$1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/upload/:table/:id', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded." });

        const filePath = req.file.location || `/uploads/${req.file.filename}`;
        await pool.query("INSERT INTO attachments (table_name, record_id, file_name, file_path, uploaded_by) VALUES ($1, $2, $3, $4, $5)", [req.params.table, req.params.id, req.file.originalname, filePath, req.user.username]);
        res.json({ success: true, url: filePath });
    } catch (err) {
        console.error("[API ERROR] POST /upload:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/table/:type', async (req, res) => {
    try {
        const { type } = req.params;
        let accessType = type;
        if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') accessType = 'purchase_orders';
        if (type === 'client_consumptions' || type === 'client_refunds') accessType = 'customers';
        if (type === 'gl_mappings') accessType = 'ledger';

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const filter = req.query.filter || '';
        const offset = (page - 1) * limit;

        let queryStr = `SELECT * FROM ${type}`;
        let countStr = `SELECT COUNT(*) FROM ${type}`;
        let prefix = "";

        if (type === 'projects') {
            prefix = "p.";
            queryStr = `SELECT p.*, (SELECT COUNT(*) FROM partners WHERE project_name = p.name) AS partners_count FROM projects p`;
            countStr = `SELECT COUNT(*) FROM projects p`;
        } else if (type === 'partners') {
            prefix = "p.";
            queryStr = `SELECT p.*, pr.company AS project_company, pr.budget AS proj_budget, (pr.budget * pr.expected_profit_percent / 100) AS proj_exp_amt, (pr.budget * pr.actual_profit_percent / 100) AS proj_act_amt, COALESCE((SELECT SUM(amount) FROM partner_deposits WHERE partner_id = p.id), 0) AS deposits, COALESCE((SELECT SUM(amount) FROM partner_withdrawals WHERE partner_id = p.id), 0) AS withdrawals FROM partners p LEFT JOIN projects pr ON p.project_name = pr.name`;
            countStr = `SELECT COUNT(*) FROM partners p LEFT JOIN projects pr ON p.project_name = pr.name`;
        } else if (type === 'subcontractors') {
            prefix = "s.";
            queryStr = `SELECT s.*, (SELECT COUNT(*) FROM subcontractor_invoices WHERE subcontractor_id = s.id) AS issued_invoices FROM subcontractors s`;
            countStr = `SELECT COUNT(*) FROM subcontractors s`;
        } else if (type === 'subcontractor_items') {
            prefix = "si.";
            queryStr = `SELECT si.*, b.project_name FROM subcontractor_items si LEFT JOIN boq b ON si.boq_id = b.id`;
            countStr = `SELECT COUNT(*) FROM subcontractor_items si`;
        } else if (type === 'boq') {
            prefix = "b.";
            queryStr = `SELECT b.*, COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0) AS assigned_qty, (b.est_qty - COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0)) AS unassigned_qty, COALESCE((SELECT SUM(curr_qty) FROM subcontractor_invoices WHERE sub_item_id IN (SELECT id FROM subcontractor_items WHERE boq_id = b.id) AND status='اعتماد مالي'), 0) AS dynamic_act_qty FROM boq b`;
            countStr = `SELECT COUNT(*) FROM boq b`;
        } else if (type === 'contracts') {
            prefix = "c.";
            queryStr = `SELECT c.*, cu.name AS customer_name, pu.unit_number FROM contracts c LEFT JOIN customers cu ON c.customer_id = cu.id LEFT JOIN property_units pu ON c.unit_id = pu.id`;
            countStr = `SELECT COUNT(*) FROM contracts c LEFT JOIN customers cu ON c.customer_id = cu.id LEFT JOIN property_units pu ON c.unit_id = pu.id`;
        } else if (type === 'installments') {
            prefix = "i.";
            queryStr = `SELECT i.*, cu.name AS customer_name, pu.project_name,
                CASE 
                    WHEN i.status = 'Paid' THEN 'Paid'
                    WHEN (SELECT COALESCE(SUM(amount), 0) FROM payment_receipts WHERE installment_id = i.id) > 0 
                         AND (SELECT COALESCE(SUM(amount), 0) FROM payment_receipts WHERE installment_id = i.id) < i.amount THEN 'Partial'
                    WHEN i.due_date < CURRENT_DATE AND i.status != 'Paid' THEN 'Due'
                    ELSE 'Pending'
                END AS dynamic_status
                FROM installments i 
                LEFT JOIN contracts c ON i.contract_id = c.id 
                LEFT JOIN property_units pu ON c.unit_id = pu.id 
                LEFT JOIN customers cu ON c.customer_id = cu.id`;
            countStr = `SELECT COUNT(*) FROM installments i LEFT JOIN contracts c ON i.contract_id = c.id LEFT JOIN property_units pu ON c.unit_id = pu.id LEFT JOIN customers cu ON c.customer_id = cu.id`;
        } else if (type === 'payment_receipts') {
            prefix = "pr.";
            queryStr = `SELECT pr.*, cu.name AS customer_name, i.installment_no AS orig_inst_no, pu.unit_number AS orig_unit_no
                FROM payment_receipts pr 
                LEFT JOIN installments i ON pr.installment_id = i.id 
                LEFT JOIN contracts c ON i.contract_id = c.id 
                LEFT JOIN property_units pu ON c.unit_id = pu.id
                LEFT JOIN customers cu ON c.customer_id = cu.id`;
            countStr = `SELECT COUNT(*) FROM payment_receipts pr LEFT JOIN installments i ON pr.installment_id = i.id LEFT JOIN contracts c ON i.contract_id = c.id LEFT JOIN customers cu ON c.customer_id = cu.id`;
        } else if (type === 'rfq') {
            prefix = "r.";
            queryStr = `SELECT r.*, p.company FROM rfq r LEFT JOIN projects p ON r.project_name = p.name`;
            countStr = `SELECT COUNT(*) FROM rfq r LEFT JOIN projects p ON r.project_name = p.name`;
        } else if (type === 'purchase_orders') {
            prefix = "po.";
            queryStr = `SELECT po.*, COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id = po.id), 0) AS ddp_added_amount, COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id = po.id), 0) AS ddp_lcy_added_amount FROM purchase_orders po`;
            countStr = `SELECT COUNT(*) FROM purchase_orders po`;
        } else if (type === 'inventory_items' || type === 'inventory') {
            prefix = "i.";
            queryStr = `SELECT i.*, po.specification, po.uom, po.fx_rate, po.qty as po_original_qty, po.estimated_cost as po_unit_cost_fcy, COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id::text = po.id::text), 0) AS po_ddp_added, COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id::text = po.id::text), 0) AS po_ddp_lcy_added FROM inventory_items i LEFT JOIN purchase_orders po ON i.po_id::text = po.id::text`;
            countStr = `SELECT COUNT(*) FROM inventory_items i LEFT JOIN purchase_orders po ON i.po_id::text = po.id::text`;
        } else if (type === 'inventory_sales') {
            prefix = "ins.";
            queryStr = `SELECT ins.*, i.po_id, po.specification, po.qty as po_original_qty, po.estimated_cost as po_unit_cost_fcy, po.fx_rate, COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id::text = i.po_id::text), 0) AS po_ddp_added, COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id::text = i.po_id::text), 0) AS po_ddp_lcy_added FROM inventory_sales ins LEFT JOIN inventory_items i ON ins.inventory_id::text = i.id::text LEFT JOIN purchase_orders po ON i.po_id::text = po.id::text`;
            countStr = `SELECT COUNT(*) FROM inventory_sales ins LEFT JOIN inventory_items i ON ins.inventory_id::text = i.id::text LEFT JOIN purchase_orders po ON i.po_id::text = i.id::text`;
        } else if (type === 'client_consumptions') {
            prefix = "cc.";
            queryStr = `
            SELECT 
                cc.*,
                c.name AS client_name,
                COALESCE(i.item_name, i.name, CASE WHEN cc.paid_amount > 0 AND cc.total_revenue = 0 THEN '🟢 رصيد دائن للعميل' ELSE 'تسوية رصيد' END) AS inventory_name
            FROM client_consumptions cc 
            LEFT JOIN customers c ON cc.client_id::text = c.id::text 
            LEFT JOIN inventory_items i ON cc.inventory_id::text = i.id::text`;
            countStr = `SELECT COUNT(*) FROM client_consumptions cc LEFT JOIN customers c ON cc.client_id::text = c.id::text LEFT JOIN inventory_items i ON cc.inventory_id::text = i.id::text`;;
        } else if (type === 'customers') {
            prefix = "c.";
            queryStr = `SELECT * FROM customers c`;
            countStr = `SELECT COUNT(*) FROM customers c`;
        } else if (type === 'client_refunds') {
            prefix = "cr.";
            queryStr = `SELECT * FROM client_refunds cr`;
            countStr = `SELECT COUNT(*) FROM client_refunds cr`;
        } else if (type === 'ddp_charges') {
            prefix = "d.";
            queryStr = `SELECT d.*, po.project_name, COALESCE(po.item_description, 'صنف غير محدد') AS item_name FROM po_ddp_lcy_charges d LEFT JOIN purchase_orders po ON d.po_id = po.id`;
            countStr = `SELECT COUNT(*) FROM po_ddp_lcy_charges d LEFT JOIN purchase_orders po ON d.po_id = po.id`;
        } else if (type === 'chart_of_accounts') {
            prefix = "c.";
            const companyId = req.query.company_id;
            let ledgerCompanyFilter = "";
            if (companyId && companyId !== 'all') {
                ledgerCompanyFilter = ` AND l.company_id = ${parseInt(companyId)}`;
            }
            queryStr = `
                SELECT c.*, 
                    COALESCE(
                        (SELECT SUM(
                            CASE 
                                WHEN sub.account_type IN ('Asset', 'Expense') THEN (l.debit - l.credit)
                                ELSE (l.credit - l.debit)
                            END
                        ) 
                        FROM ledger l 
                        JOIN chart_of_accounts sub ON l.account_name = sub.account_name
                        WHERE CAST(sub.account_code AS TEXT) LIKE (RTRIM(CAST(c.account_code AS TEXT), '0') || '%')
                        ${ledgerCompanyFilter}
                        ), 
                    0) AS balance 
                FROM chart_of_accounts c
            `;
            countStr = `SELECT COUNT(*) FROM chart_of_accounts c`;
        } else if (type === 'ledger') { // 🌟 التعديل هنا: إضافة تعريف جدول القيود المحاسبية 🌟
            prefix = "l.";
            queryStr = `SELECT l.* FROM ledger l`;
            countStr = `SELECT COUNT(*) FROM ledger l`;
        } else if (type === 'gl_mappings') {
            prefix = "g.";
            queryStr = `SELECT g.* FROM gl_mappings g`;
            countStr = `SELECT COUNT(*) FROM gl_mappings g`;
        } else if (type === 'real_estate_installments') {
            prefix = "i.";
            queryStr = `
                SELECT i.*, c.customer_name, c.project_name, u.unit_number, c.id as contract_ref
                FROM real_estate_installments i
                LEFT JOIN real_estate_contracts c ON i.contract_id = c.id
                LEFT JOIN real_estate_units u ON c.unit_id = u.id
            `;
            countStr = `SELECT COUNT(*) FROM real_estate_installments i`;
        }

        let conditions = []; let params = [];

        const companyId = req.query.company_id;
        if (companyId && companyId !== 'all') {
            if (type === 'chart_of_accounts') {
                let entityName = "";
                if (companyId === '1') entityName = 'TED Capital';
                if (companyId === '2') entityName = 'Design Concept';
                if (companyId === '3') entityName = 'Master Builder';
                if (entityName) {
                    conditions.push(`(c.company_entity = 'All' OR c.company_entity = $${params.length + 1})`);
                    params.push(entityName);
                }
            } else if (type === 'ledger') {
                conditions.push(`l.company_id = $${params.length + 1}`);
                params.push(parseInt(companyId));
            }
        }

        if (filter) {
            if (['contracts', 'installments', 'payment_receipts'].includes(type)) { conditions.push(`pu.project_name = $${params.length + 1}`); params.push(filter); }
            else if (['projects', 'partners', 'boq', 'tasks', 'daily_reports', 'rfq', 'purchase_orders', 'subcontractors', 'inventory', 'inventory_items', 'inventory_bookings', 'material_usage', 'ar_invoices', 'inventory_sales'].includes(type)) { conditions.push(`${prefix}project_name = $${params.length + 1}`); params.push(filter); }
            else if (type === 'inventory_transfers') { conditions.push(`(${prefix}from_project = $${params.length + 1} OR ${prefix}to_project = $${params.length + 1})`); params.push(filter); }
            else if (type === 'returns') { conditions.push(`(${prefix}project_name = $${params.length + 1} OR ${prefix}return_to = $${params.length + 1})`); params.push(filter); }
            else if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') { conditions.push(`po_id = $${params.length + 1}`); params.push(filter); }
            else if (type === 'ddp_charges') { conditions.push(`po.project_name = $${params.length + 1}`); params.push(filter); }
            else if (type === 'client_consumptions') { conditions.push(`cc.client_id = $${params.length + 1}`); params.push(filter); }
            else if (type === 'client_refunds') { conditions.push(`cr.client_id = $${params.length + 1}`); params.push(filter); }
            else if (type === 'partner_deposits' || type === 'partner_withdrawals') { conditions.push(`partner_id = $${params.length + 1}`); params.push(filter); }
        }

        if (search) {
            const searchIdx = params.length + 1;
            if (type === 'installments') { conditions.push(`(cu.name ILIKE $${searchIdx} OR i.installment_no ILIKE $${searchIdx} OR i.unit_number ILIKE $${searchIdx} OR CAST(i.contract_id AS TEXT) ILIKE $${searchIdx} OR pu.project_name ILIKE $${searchIdx})`); }
            else if (type === 'contracts') { conditions.push(`(cu.name ILIKE $${searchIdx} OR pu.unit_number ILIKE $${searchIdx} OR c.contract_type ILIKE $${searchIdx} OR CAST(c.id AS TEXT) ILIKE $${searchIdx})`); }
            else if (type === 'payment_receipts') { conditions.push(`(cu.name ILIKE $${searchIdx} OR pr.reference_no ILIKE $${searchIdx} OR i.installment_no ILIKE $${searchIdx})`); }
            else if (type === 'inventory_sales' || type === 'inventory_bookings') { conditions.push(`(${prefix}customer_name ILIKE $${searchIdx} OR ${prefix}project_name ILIKE $${searchIdx})`); }
            else if (type === 'partners') { conditions.push(`(p.name ILIKE $${searchIdx} OR p.project_name ILIKE $${searchIdx})`); }
            else if (type === 'subcontractors') { conditions.push(`(s.name ILIKE $${searchIdx} OR s.project_name ILIKE $${searchIdx})`); }
            else if (type === 'chart_of_accounts') { conditions.push(`(account_name ILIKE $${searchIdx} OR account_code ILIKE $${searchIdx})`); }
            else if (type === 'client_consumptions') { conditions.push(`(c.name ILIKE $${searchIdx} OR i.name ILIKE $${searchIdx})`); }
            else if (type === 'customers') { conditions.push(`(c.name ILIKE $${searchIdx} OR c.company_name ILIKE $${searchIdx} OR c.legal_id ILIKE $${searchIdx})`); }
            else { conditions.push(`(CAST(${prefix}id AS TEXT) ILIKE $${searchIdx})`); }
            params.push(`%${search}%`);
        }

        // --- 🌟 RLS (Resource Level Security) Injection 🌟 ---
        const userRole = (req.user.role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'super admin' || userRole === 'superadmin' || req.user.isSuperAdmin;

        if (!isAdmin) {
            const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
            if (type === 'projects') {
                if (!perms.includes('PROJ_VIEW_ALL') && perms.includes('PROJ_VIEW_BRANCH')) {
                    conditions.push(`org_unit_id = $${params.length + 1}`);
                    params.push(req.user.primaryOrgUnitId);
                } else if (!perms.includes('PROJ_VIEW_ALL')) {
                    // If no global or branch permission, only see projects where they are managers
                    conditions.push(`project_manager = $${params.length + 1}`);
                    params.push(req.user.username);
                }
            } else if (type === 'customers') {
                if (!perms.includes('COMP_VIEW_ALL') && req.user.primaryOrgUnitId) {
                    conditions.push(`org_unit_id = $${params.length + 1}`);
                    params.push(req.user.primaryOrgUnitId);
                }
            }
        }
        // --------------------------------------------------

        if (conditions.length > 0) {
            const whereClause = " WHERE " + conditions.join(" AND ");
            queryStr += whereClause;
            countStr += whereClause;
        }

        if (type === 'client_consumptions') {
            queryStr += ` ORDER BY cc.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        } else if (type === 'chart_of_accounts') {
            queryStr += ` ORDER BY c.account_code ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        } else {
            queryStr += ` ORDER BY ${prefix}id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        }

        const result = await pool.query(queryStr, [...params, limit, offset]);
        const countResult = await pool.query(countStr, params);
        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error(`[API ERROR] GET /table/${req.params.type}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 🌟 Stock Transfer logic (Internal Movement)
// =========================================================================
router.post('/inventory/transfer', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { inventory_id, qty, to_warehouse, to_project } = req.body;

        // 1. Get original item
        const itemRes = await client.query("SELECT * FROM inventory_items WHERE id = $1", [inventory_id]);
        if (itemRes.rows.length === 0) throw new Error("Item not found");
        const item = itemRes.rows[0];

        if (parseFloat(item.remaining_qty) < parseFloat(qty)) throw new Error("Insufficient stock for transfer");

        // 2. Reduce qty from original
        await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2", [qty, inventory_id]);

        // 3. Create new entry in destination (or update existing)
        const insertQuery = `
            INSERT INTO inventory_items (po_id, item_name, quantity, remaining_qty, buy_price, avg_cost, project_name, warehouse, master_po_no, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        await client.query(insertQuery, [
            item.po_id, item.item_name, qty, qty, item.buy_price, item.avg_cost,
            to_project || item.project_name,
            to_warehouse || item.warehouse,
            item.master_po_no, req.user.username
        ]);

        // 4. Log movement
        await logAudit(req.user.username, 'STOCK_TRANSFER', 'inventory_items', inventory_id, `Transferred ${qty} of ${item.item_name} to ${to_warehouse || to_project}`);

        await client.query('COMMIT');
        res.json({ success: true, message: "Internal transfer completed successfully" });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// =========================================================================
// ACID TRANSACTIONS FOR ALL DYNAMIC ADDS (Includes Journal Entries Linkage)
// =========================================================================
// Intercept sales creation to use our new Controller with Double Entry
router.post('/add/inventory_sales', authenticateToken, salesController.addSale);

router.post('/add/:type', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { type } = req.params;
        let pNameForSync = null;
        let skipInsert = false;
        let newId = null;

        // 🌟 التعديل 1: إيقاف الإدراج التلقائي لدفتر اليومية لمنع التكرار (لأن دالة autoLedgerEntry ستقوم بالمهمة)
        if (type === 'ledger') skipInsert = true;

        let accessType = type;
        if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') accessType = 'purchase_orders';
        if (type === 'gl_mappings') accessType = 'ledger';

        if (!hasAccess(req.user, accessType, 'create')) {
            throw new Error("Access Denied.");
        }

        let data = req.body;
        pNameForSync = data.project_name || (type === 'projects' ? data.name : null);

        const calcFields = ['charge_id', 'dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'expected_profit_amount', 'actual_profit_amount', 'partners_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'actual_profit', 'waivePenalty'];
        calcFields.forEach(f => delete data[f]);

        if (type === 'inventory' || type === 'inventory_sales') {
            delete data.specification;
        }

        for (let key in data) { if (data[key] === "") data[key] = null; }

        if (type === 'po_ddp_lcy_charges') {
            if (data.fcy_amount && parseFloat(data.fcy_amount) > 0) {
                data.amount = parseFloat(data.fcy_amount) * parseFloat(data.fx_rate || 1);
            }
        }

        // 🌟 الامتثال الضريبي (ZATCA / Tax E-Invoicing) 🌟
        // اعتراض فواتير المبيعات لتوليد وتشفير الـ QR Code قبل الحفظ في قاعدة البيانات
        if (type === 'ar_invoices') {
            try {
                // استدعاء ملف الخدمة الذي سننشئه لاحقاً لتشفير بيانات الفاتورة
                const { generateTaxQRCode } = require('../services/taxIntegration');
                data.qr_code = await generateTaxQRCode(data);
            } catch (taxErr) {
                console.warn("Tax Integration Warning: Could not generate QR Code.", taxErr.message);
            }
        }

        if (type === 'projects') {
            if (data.budget_lcy !== undefined && data.budget_lcy !== null) { data.budget = data.budget_lcy; delete data.budget_lcy; }
        }

        if (type === 'partners') {
            const currentShare = parseFloat(data.share_percent) || 0;
            const sumQuery = await client.query("SELECT SUM(share_percent) as total FROM partners WHERE project_name = $1", [data.project_name]);
            if (((parseFloat(sumQuery.rows[0]?.total) || 0) + currentShare) > 100) throw new Error(`Total share exceeds 100%.`);
        }

        if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') {
            data.created_by = req.user.username;
        }

        if (type === 'returns') {
            if (data.return_material) { data.material = data.return_material; delete data.return_material; }
            if (data.return_qty) { data.qty = data.return_qty; delete data.return_qty; }
            if (data.return_project) { data.project_name = data.return_project; delete data.return_project; }
        }
        if (type === 'inventory_transfers') {
            if (data.transfer_material) { data.material = data.transfer_material; delete data.transfer_material; }
            if (data.transfer_qty) { data.qty = data.transfer_qty; delete data.transfer_qty; }
            if (data.transfer_from) { data.from_project = data.transfer_from; delete data.from_project; }
            if (data.transfer_to) { data.to_project = data.transfer_to; delete data.to_project; }
        }
        if (type === 'inventory' || type === 'inventory_items') {
            if (!data.remaining_qty) data.remaining_qty = data.qty || data.quantity;

            // 🌟 السحر المحاسبي: تطبيق خوارزمية المتوسط المرجح (Moving Average) عند الإضافة اليدوية
            const newQty = parseFloat(data.qty) || parseFloat(data.quantity) || 0;
            const newPrice = parseFloat(data.buy_price) || 0;
            const itemName = data.item_name || data.name;

            if (newQty > 0 && newPrice > 0 && itemName) {
                // البحث عما إذا كان الصنف موجوداً مسبقاً في المخزن بنفس الاسم
                const checkInv = await client.query("SELECT remaining_qty, buy_price FROM inventory_items WHERE item_name = $1 OR name = $1 LIMIT 1", [itemName]);
                if (checkInv.rows.length > 0) {
                    const currentQty = parseFloat(checkInv.rows[0].remaining_qty) || 0;
                    const currentPrice = parseFloat(checkInv.rows[0].buy_price) || 0;

                    // حساب السعر الجديد وتحديث البيانات قبل الحفظ
                    data.buy_price = calculateMovingAverage(currentQty, currentPrice, newQty, newPrice);
                    data.avg_cost = data.buy_price;
                }
            }
        }

        if (type === 'inventory_sales' || type === 'material_usage') {
            const qtyField = type === 'material_usage' ? data.qty : data.qty;
            const invIdField = type === 'material_usage' ? "item_name" : "id";
            const invVal = type === 'material_usage' ? data.material : data.inventory_id;

            const invCheck = await client.query(`SELECT remaining_qty FROM inventory_items WHERE ${invIdField} = $1 OR (name = $1 AND $1 IS NOT NULL)`, [invVal]);
            if (invCheck.rows.length > 0) {
                if (parseFloat(qtyField) > parseFloat(invCheck.rows[0]?.remaining_qty || 0)) {
                    throw new Error("Insufficient available stock (Available stock cannot be less than 0).");
                }
            }
        }

        if (type === 'material_usage') {
            const invCheck = await client.query("SELECT buy_price FROM inventory_items WHERE item_name = $1 OR name = $1 LIMIT 1", [data.material]);
            data.est_cost = (parseFloat(data.qty) * (invCheck.rows.length > 0 ? parseFloat(invCheck.rows[0]?.buy_price || 0) : 0)).toFixed(2);
        }

        if (type === 'inventory_sales') {
            const invCheck = await client.query(`
                SELECT i.item_name, i.name, i.buy_price, i.po_id, po.estimated_cost as po_unit_cost_fcy, po.qty as po_qty, po.fx_rate,
                COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id::text = i.po_id::text), 0) AS ddp_fcy,
                COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id::text = i.po_id::text), 0) AS ddp_lcy
                FROM inventory_items i
                LEFT JOIN purchase_orders po ON i.po_id::text = po.id::text
                WHERE i.id = $1
            `, [data.inventory_id]);

            if (invCheck.rows.length > 0) {
                const item = invCheck.rows[0];
                let calculatedLcy = parseFloat(item.buy_price || 0);

                if (item.po_id && item.po_unit_cost_fcy !== null) {
                    const q = parseFloat(item.po_qty) || 1;
                    const ucFcy = parseFloat(item.po_unit_cost_fcy) || 0;
                    const fx = parseFloat(item.fx_rate) || 1;
                    const ddpFcy = parseFloat(item.ddp_fcy) || 0;
                    const ddpLcy = parseFloat(item.ddp_lcy) || 0;

                    const exWork = q * ucFcy;
                    const totalDdpFcy = exWork + ddpFcy;
                    const totalDdpLcy = (totalDdpFcy * fx) + ddpLcy;
                    calculatedLcy = q > 0 ? (totalDdpLcy / q) : 0;
                }

                data.buy_price = calculatedLcy;
                data.item_name = item.item_name || item.name || 'Unknown';
            }
            data.created_by = req.user.username;
        }

        if (type === 'client_consumptions') {
            data.created_by = req.user.username;
            const consumedQty = parseFloat(data.consumed_qty || 0);
            const paidAmt = parseFloat(data.paid_amount || 0);
            const bookingAmt = parseFloat(data.total_revenue || 0);

            let outstanding = bookingAmt - paidAmt;
            if (outstanding < 0) outstanding = 0;
            data.outstanding_balance = outstanding;

            let excess = paidAmt - bookingAmt;
            let usedExcess = 0;

            if (excess > 0) {
                const debts = await client.query("SELECT * FROM client_delayed_payments WHERE client_id = $1 AND status != 'Paid' ORDER BY due_date ASC", [data.client_id]);
                for (let debt of debts.rows) {
                    if (excess <= 0) break;
                    let debtAmt = parseFloat(debt.amount);
                    if (excess >= debtAmt) {
                        excess -= debtAmt;
                        usedExcess += debtAmt;
                        await client.query("UPDATE client_delayed_payments SET amount = 0, status = 'Paid', paid_amount = original_amount, last_payment_date = CURRENT_DATE WHERE id = $1", [debt.id]);
                    } else {
                        usedExcess += excess;
                        await client.query("UPDATE client_delayed_payments SET amount = amount - $1, paid_amount = paid_amount + $1, last_payment_date = CURRENT_DATE WHERE id = $2", [excess, debt.id]);
                        excess = 0;
                    }
                }
                data.paid_amount = paidAmt - usedExcess;
            }
        }

        if (type === 'payment_receipts' && data.installment_id) {
            const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [data.installment_id]);
            if (instRes.rows.length > 0) {
                const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [data.installment_id]);
                const paidSoFar = parseFloat(paidSoFarRes.rows[0]?.total || 0);
                const newlyPaid = parseFloat(data.amount) || 0;

                if ((paidSoFar + newlyPaid) > instAmt) {
                    throw new Error("Collected Amount Cannot Exceed Installment Total Amount.");
                }

                data.outstanding_amount = instAmt - (paidSoFar + newlyPaid);
                if (data.outstanding_amount < 0) data.outstanding_amount = 0;
            }
        }

        // 🌟 التعديل 2: تم مسح الكود المزدوج والمشوه لـ inventory_sales من هنا لمنع مضاعفة الخصم من المخزون، وسنعتمد على الكود الشامل بالأسفل.

        if (!skipInsert) {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

            if (keys.length > 0) {
                if (type === 'gl_mappings') {
                    // آلية Upsert لتفادي خطأ التكرار وتحديث الحسابات مباشرة
                    const mappingQuery = `
                         INSERT INTO gl_mappings (transaction_type, debit_account, credit_account, cost_center_required) 
                         VALUES ($1, $2, $3, $4) 
                         ON CONFLICT (transaction_type) 
                         DO UPDATE SET 
                             debit_account = EXCLUDED.debit_account, 
                             credit_account = EXCLUDED.credit_account,
                             cost_center_required = EXCLUDED.cost_center_required
                         RETURNING id
                     `;
                    const mappingValues = [
                        data.transaction_type,
                        data.debit_account,
                        data.credit_account,
                        data.cost_center_required
                    ];
                    const result = await client.query(mappingQuery, mappingValues);
                    newId = result.rows[0].id;
                } else {
                    const result = await client.query(`INSERT INTO ${type} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`, values);
                    newId = result.rows[0].id;
                }
            }
        }

        if (newId) {
            await logAudit(req.user.username, skipInsert ? 'UPDATE' : 'CREATE', type, newId, skipInsert ? `Aggregated record in ${type}` : `Added record to ${type}`);

            // توليد تنبيه عند الإضافة (مثل المخزون أو إضافات النظام الهامة)
            if (['inventory', 'projects', 'subcontractors'].includes(type) && !skipInsert) {
                const title = type === 'inventory' ? 'إضافة مخزون جديد' : (type === 'projects' ? 'مشروع جديد' : 'سجل جديد');
                const itemName = data.name || data.item_name || newId;
                await client.query(
                    "INSERT INTO system_notifications (type, title, message, link) VALUES ($1, $2, $3, $4)",
                    [`NEW_${type.toUpperCase()}`, title, `تم إضافة ${itemName} بواسطة ${req.user.username}`, `/${type}/${newId}`]
                );
            }
        }

        if (type === 'payment_receipts' && data.installment_id && !skipInsert) {
            const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [data.installment_id]);
            if (instRes.rows.length > 0) {
                const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [data.installment_id]);
                const totalPaid = parseFloat(paidSoFarRes.rows[0]?.total || 0);

                const newStatus = totalPaid >= instAmt ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
                await client.query("UPDATE installments SET status = $1, paid_amount = $2 WHERE id = $3", [newStatus, totalPaid, data.installment_id]);

                // القيود الآلية (GL) للمقبوضات
                const receiptAmt = parseFloat(data.amount || 0);
                const projName = data.project_name || 'General';
                await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', projName, receiptAmt, 0, `إيصال استلام من عميل - قسط ${data.installment_no || ''}`, req.user.username);
                await autoLedgerEntry(client, 'العملاء', projName, 0, receiptAmt, `إيصال استلام من عميل - قسط ${data.installment_no || ''}`, req.user.username);
            }
        }

        if (type === 'material_usage' && !skipInsert) {
            await client.query("UPDATE inventory_items SET remaining_qty = COALESCE(remaining_qty, quantity) - $1 WHERE item_name = $2 OR name = $2", [data.qty, data.material]);
            const invIdRes = await client.query("SELECT id FROM inventory_items WHERE item_name = $1 OR name = $1", [data.material]);
            if (invIdRes.rows.length > 0) await checkAndSendLowStockEmail(invIdRes.rows[0].id);
        }

        if (type === 'inventory_sales' && !skipInsert) {
            // 🌟 التعديل 3: استخدام ::text لمنع الانهيار وتوحيد الأنواع
            await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1, quantity = quantity - $1 WHERE id::text = $2::text", [data.qty, data.inventory_id]);
            await checkAndSendLowStockEmail(data.inventory_id);
            try {
                const custRes = await client.query("SELECT id, credit_balance FROM customers WHERE name = $1", [data.customer_name]);
                if (custRes.rows.length > 0) {
                    const clientId = custRes.rows[0].id;
                    const totalRev = parseFloat(data.sell_price || 0) * parseFloat(data.qty || 0);

                    // --- التسوية التلقائية من محفظة العميل عبر الرابط (Client Wallet) ---
                    let amountPaidFromCredit = 0;
                    if (req.query.deduct_credit === 'true') {
                        const availableCredit = parseFloat(custRes.rows[0].credit_balance || 0);
                        amountPaidFromCredit = Math.min(totalRev, availableCredit);
                        if (amountPaidFromCredit > 0) {
                            await client.query("UPDATE customers SET credit_balance = GREATEST(0, credit_balance - $1) WHERE id::text = $2::text", [amountPaidFromCredit, clientId]);
                        }
                    }

                    const outstanding = Math.max(0, totalRev - amountPaidFromCredit);

                    const duplicateCheck = await client.query(
                        "SELECT id FROM client_consumptions WHERE client_id::text = $1::text AND inventory_id::text = $2::text AND consumed_qty = $3 AND total_revenue = $4 AND outstanding_date = $5 LIMIT 1",
                        [clientId, data.inventory_id || null, data.qty, totalRev, data.date]
                    );

                    if (duplicateCheck.rows.length === 0) {
                        const ccRes = await client.query(
                            "INSERT INTO client_consumptions (client_id, inventory_id, consumed_qty, paid_amount, outstanding_balance, outstanding_date, created_by, total_revenue) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
                            [clientId, data.inventory_id || null, data.qty, amountPaidFromCredit, outstanding, data.date, req.user ? req.user.username : 'System', totalRev]
                        );

                        if (outstanding > 0) {
                            await client.query(
                                "INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount, status, consumption_id) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8)",
                                [clientId, outstanding, totalRev, data.date, data.inventory_id || null, data.qty, amountPaidFromCredit, ccRes.rows[0].id]
                            );
                        }

                        // توليد القيود العكسية للتسوية من الرصيد الدائن إن وجدت
                        if (amountPaidFromCredit > 0) {
                            await autoLedgerEntry(client, 'دفعات مقدمة من العملاء', 'General', amountPaidFromCredit, 0, `تسوية مبيعات من الرصيد الدائن للعميل رقم ${clientId}`, req.user ? req.user.username : 'System');
                            await autoLedgerEntry(client, 'العملاء', 'General', 0, amountPaidFromCredit, `تسوية مبيعات من الرصيد الدائن للعميل رقم ${clientId}`, req.user ? req.user.username : 'System');
                        }

                        // 🌟 إغلاق القائمة: قيد تكلفة البضاعة المباعة (COGS) 🌟
                        const totalCost = parseFloat(data.buy_price || 0) * parseFloat(data.qty || 0);
                        await autoLedgerEntry(client, 'تكلفة خامات ومواد (منصرف)', data.project_name || 'General', totalCost, 0, `تكلفة مبيعات للعميل ${data.customer_name}`, req.user ? req.user.username : 'System');
                        await autoLedgerEntry(client, 'مخزون خامات ومواد', data.project_name || 'General', 0, totalCost, `تكلفة مبيعات للعميل ${data.customer_name}`, req.user ? req.user.username : 'System');
                    }
                }
            } catch (e) {
                console.error("[API ERROR] Auto-insert client_consumptions failed:", e);
            }
        }

        if (type === 'client_consumptions' && !skipInsert) {
            if (parseFloat(data.consumed_qty) > 0) {
                // جلب بيانات الصنف وسعر التكلفة لتسجيل القيد
                const invCheck = await client.query("SELECT remaining_qty, buy_price, item_name, name FROM inventory_items WHERE id::text = $1::text", [data.inventory_id]);
                if (invCheck.rows.length > 0 && parseFloat(invCheck.rows[0]?.remaining_qty || 0) >= parseFloat(data.consumed_qty)) {
                    await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id::text = $2::text", [data.consumed_qty, data.inventory_id]);

                    // 🌟 إغلاق القائمة: قيد تكلفة الاستهلاك المباشر (COGS) 🌟
                    const totalCost = parseFloat(invCheck.rows[0].buy_price || 0) * parseFloat(data.consumed_qty);
                    const itmName = invCheck.rows[0].item_name || invCheck.rows[0].name;
                    await autoLedgerEntry(client, 'تكلفة خامات ومواد (منصرف)', 'General', totalCost, 0, `استهلاك مخزني لصنف: ${itmName}`, req.user ? req.user.username : 'System');
                    await autoLedgerEntry(client, 'مخزون خامات ومواد', 'General', 0, totalCost, `استهلاك مخزني لصنف: ${itmName}`, req.user ? req.user.username : 'System');
                }
            }

            if (parseFloat(data.outstanding_balance) > 0) {
                await client.query(
                    "INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, 0)",
                    [data.client_id, data.outstanding_balance, data.outstanding_balance, data.outstanding_date, data.inventory_id || null, data.consumed_qty]
                );
            }
        }

        if (type === 'returns') await client.query("UPDATE inventory_items SET remaining_qty = COALESCE(remaining_qty, quantity) + $1 WHERE item_name = $2 OR name = $2", [data.qty, data.material]);

        if (type === 'inventory_transfers') {
            await client.query("UPDATE inventory_items SET remaining_qty = COALESCE(remaining_qty, quantity) - $1 WHERE (item_name = $2 OR name = $2) AND (project_name = $3 OR project_name IS NULL)", [data.qty, data.material, data.from_project]);
            await client.query("UPDATE inventory_items SET remaining_qty = COALESCE(remaining_qty, quantity) + $1 WHERE (item_name = $2 OR name = $2) AND (project_name = $3 OR project_name IS NULL)", [data.qty, data.material, data.to_project]);
        }

        if (type === 'client_refunds' && !skipInsert) {
            const refundAmt = parseFloat(data.amount || 0);
            if (refundAmt > 0) {
                await client.query("UPDATE customers SET credit_balance = GREATEST(0, COALESCE(credit_balance, 0) - $1) WHERE id = $2", [refundAmt, data.client_id]);

                let remainingToDeduct = refundAmt;
                const creditRows = await client.query(
                    "SELECT id, paid_amount, total_revenue FROM client_consumptions WHERE client_id = $1 AND paid_amount > total_revenue ORDER BY id ASC",
                    [data.client_id]
                );

                for (let row of creditRows.rows) {
                    if (remainingToDeduct <= 0) break;
                    let rowCredit = parseFloat(row.paid_amount) - parseFloat(row.total_revenue);
                    let deductFromRow = Math.min(rowCredit, remainingToDeduct);

                    await client.query(
                        "UPDATE client_consumptions SET paid_amount = paid_amount - $1 WHERE id = $2",
                        [deductFromRow, row.id]
                    );
                    remainingToDeduct -= deductFromRow;
                }

                // القيود الآلية للصرف (GL)
                await autoLedgerEntry(client, 'العملاء', 'General', refundAmt, 0, `صرف رصيد دائن للعميل نقداً`, req.user.username);
                await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', 'General', 0, refundAmt, `صرف رصيد دائن للعميل نقداً`, req.user.username);
            }
        }

        // --- NEW LEDGER INTEGRATIONS (Partner Finance & DDP Charges) ---
        if (type === 'partner_deposits' && !skipInsert) {
            const amt = parseFloat(data.amount || 0);
            const partnerRes = await client.query("SELECT name, project_name FROM partners WHERE id = $1", [data.partner_id]);
            const pName = partnerRes.rows.length > 0 ? partnerRes.rows[0].project_name : 'General';
            const partnerName = partnerRes.rows.length > 0 ? partnerRes.rows[0].name : '';
            await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', pName, amt, 0, `إيداع شريك: ${partnerName} - ${data.reference_no || ''}`, req.user.username);
            await autoLedgerEntry(client, 'جاري الشركاء', pName, 0, amt, `إيداع شريك: ${partnerName} - ${data.reference_no || ''}`, req.user.username);
        }

        if (type === 'partner_withdrawals' && !skipInsert) {
            const amt = parseFloat(data.amount || 0);
            const partnerRes = await client.query("SELECT name, project_name FROM partners WHERE id = $1", [data.partner_id]);
            const pName = partnerRes.rows.length > 0 ? partnerRes.rows[0].project_name : 'General';
            const partnerName = partnerRes.rows.length > 0 ? partnerRes.rows[0].name : '';
            await autoLedgerEntry(client, 'جاري الشركاء', pName, amt, 0, `سحب شريك: ${partnerName} - ${data.reference_no || ''}`, req.user.username);
            await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', pName, 0, amt, `سحب شريك: ${partnerName} - ${data.reference_no || ''}`, req.user.username);
        }

        if (type === 'po_ddp_lcy_charges' && !skipInsert) {
            const amt = parseFloat(data.amount || 0);
            const poRes = await client.query("SELECT project_name FROM purchase_orders WHERE id = $1", [data.po_id]);
            const pName = poRes.rows.length > 0 ? poRes.rows[0].project_name : 'General';
            await autoLedgerEntry(client, 'مصاريف استيراد وشحن مباشرة', pName, amt, 0, `مصروفات تخليص وشحن PO-${data.po_id}: ${data.description || data.charge_type || ''}`, req.user.username);
            await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', pName, 0, amt, `مصروفات تخليص وشحن PO-${data.po_id}: ${data.description || data.charge_type || ''}`, req.user.username);
        }

        // --- NEW: Payroll Ledger Integration (ربط إصدار الرواتب بالقيود الآلية) ---
        if (type === 'payroll' && !skipInsert) {
            const b = parseFloat(data.basic_salary || 0);
            const a = parseFloat(data.allowances || 0);
            const d = parseFloat(data.deductions || 0);
            const netAmount = b + a - d;

            const staffName = data.staff_name || 'غير محدد';
            const month = data.month || '';
            const pName = data.project_name || 'General';
            const desc = `صرف راتب الموظف ${staffName} عن شهر ${month}`;

            let debitAcc = 'رواتب الإدارة';
            let creditAcc = 'صندوق نقدية - تيد كابيتال';

            // محاولة جلب الحسابات المربوطة من شاشة الإعدادات إن وُجدت
            const mappingRes = await client.query("SELECT debit_account, credit_account FROM gl_mappings WHERE transaction_type ILIKE '%Payroll%' LIMIT 1");
            if (mappingRes.rows.length > 0) {
                debitAcc = mappingRes.rows[0].debit_account;
                creditAcc = mappingRes.rows[0].credit_account;
            }

            await autoLedgerEntry(client, debitAcc, pName, netAmount, 0, desc, req.user.username);
            await autoLedgerEntry(client, creditAcc, pName, 0, netAmount, desc, req.user.username);
        }
        // ---------------------------------------------------------------

        if (type === 'ledger') await autoLedgerEntry(client, data.account_name, data.cost_center, cleanNumeric(data.debit), cleanNumeric(data.credit), data.description, req.user.username);

        if (pNameForSync && pNameForSync !== 'General') {
            try {
                await syncProjectFinancials(pNameForSync, client);
            } catch (syncErr) {
                console.warn("تم تخطي خطأ مزامنة المشروع لتجنب انهيار العملية:", syncErr.message);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, id: newId });
    } catch (err) {
        await client.query('ROLLBACK');
        // اصطياد خطأ التكرار في قاعدة البيانات وإرجاع رسالة واضحة للواجهة
        if (err.code === '23505') {
            return res.status(400).json({ error: 'هذا السجل (أو نوع المعاملة) موجود مسبقاً في قاعدة البيانات ولا يمكن تكراره.' });
        }
        console.error(`[API ERROR] POST /add/${req.params.type}:`, err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.put('/update/:type/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { type, id } = req.params;
        let accessType = type;
        if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') accessType = 'purchase_orders';
        if (type === 'gl_mappings') accessType = 'ledger';

        if (!hasAccess(req.user, accessType, 'update')) throw new Error("Access Denied.");

        let data = req.body;
        let pNameForSync = data.project_name || (type === 'projects' ? data.name : null);

        const calcFields = ['charge_id', 'dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'expected_profit_amount', 'actual_profit_amount', 'partners_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'actual_profit', 'waivePenalty'];

        calcFields.forEach(f => delete data[f]);

        if (type === 'inventory' || type === 'inventory_sales') {
            delete data.specification;
        }

        if (type === 'projects') {
            if (data.budget_lcy !== undefined && data.budget_lcy !== null) {
                data.budget = data.budget_lcy;
                delete data.budget_lcy;
            }
        }

        for (let key in data) { if (data[key] === "") data[key] = null; }

        if (type === 'po_ddp_lcy_charges') {
            if (data.fcy_amount && parseFloat(data.fcy_amount) > 0) {
                data.amount = parseFloat(data.fcy_amount) * parseFloat(data.fx_rate || 1);
            }
        }

        if (type === 'client_consumptions' && parseFloat(data.outstanding_balance) < 0) {
            data.outstanding_balance = 0;
        }

        if (type === 'client_consumptions' && (!data.consumed_qty || data.consumed_qty === "")) {
            data.consumed_qty = 0;
        }

        if (type === 'payment_receipts') {
            const oldRec = await client.query("SELECT amount, installment_id FROM payment_receipts WHERE id = $1", [id]);
            if (oldRec.rows.length > 0) {
                const instId = data.installment_id || oldRec.rows[0].installment_id;
                const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [instId]);
                if (instRes.rows.length > 0) {
                    const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                    const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1 AND id != $2", [instId, id]);
                    const paidOther = parseFloat(paidSoFarRes.rows[0]?.total || 0);
                    const newlyPaid = parseFloat(data.amount) || 0;

                    if ((paidOther + newlyPaid) > instAmt) {
                        throw new Error("Collected Amount Cannot Exceed Installment Total Amount.");
                    }

                    data.outstanding_amount = instAmt - (paidOther + newlyPaid);
                    if (data.outstanding_amount < 0) data.outstanding_amount = 0;
                }
            }
        }

        if (type === 'inventory_sales') {
            const oldRes = await client.query("SELECT * FROM inventory_sales WHERE id = $1", [id]);
            if (oldRes.rows.length > 0) {
                const oldSale = oldRes.rows[0];
                const oldTotalRev = parseFloat(oldSale.sell_price || 0) * parseFloat(oldSale.qty || 0);
                const diff = parseFloat(data.qty || oldSale.qty) - parseFloat(oldSale.qty);

                if (diff !== 0) {
                    const invCheck = await client.query("SELECT remaining_qty FROM inventory WHERE id = $1", [data.inventory_id || oldSale.inventory_id]);
                    if (diff > 0 && parseFloat(invCheck.rows[0]?.remaining_qty || 0) < diff) {
                        throw new Error("الكمية المتاحة في المخزن لا تكفي للزيادة المطلوبة.");
                    }
                    await client.query("UPDATE inventory SET remaining_qty = remaining_qty - $1 WHERE id = $2", [diff, data.inventory_id || oldSale.inventory_id]);
                }

                const newQty = parseFloat(data.qty || oldSale.qty);
                const newPrice = parseFloat(data.sell_price || oldSale.sell_price);
                const newTotalRev = newQty * newPrice;
                const custName = data.customer_name || oldSale.customer_name;

                const custRes = await client.query("SELECT id FROM customers WHERE TRIM(LOWER(name)) = TRIM(LOWER($1))", [custName]);
                if (custRes.rows.length > 0) {
                    const clientId = custRes.rows[0].id;
                    const oldCustRes = await client.query("SELECT id FROM customers WHERE TRIM(LOWER(name)) = TRIM(LOWER($1))", [oldSale.customer_name]);
                    const oldClientId = oldCustRes.rows.length > 0 ? oldCustRes.rows[0].id : clientId;

                    await client.query(`
                        UPDATE client_consumptions 
                        SET client_id = $1, consumed_qty = $2, total_revenue = $3, outstanding_balance = GREATEST(0, outstanding_balance + ($3 - $4))
                        WHERE id IN (
                            SELECT id FROM client_consumptions 
                            WHERE client_id = $5 AND (inventory_id = $6 OR (inventory_id IS NULL AND $6 IS NULL)) 
                            AND consumed_qty = $7 AND total_revenue = $4 
                            LIMIT 1
                        )
                    `, [clientId, newQty, newTotalRev, oldTotalRev, oldClientId, oldSale.inventory_id || null, oldSale.qty]);

                    await client.query(`
                        UPDATE client_delayed_payments 
                        SET client_id = $1, amount = GREATEST(0, amount + ($2 - $3)), original_amount = $2, consumed_qty = $4
                        WHERE id IN (
                            SELECT id FROM client_delayed_payments 
                            WHERE client_id = $5 AND (inventory_id = $6 OR (inventory_id IS NULL AND $6 IS NULL)) 
                            AND original_amount = $3 
                            LIMIT 1
                        )
                    `, [clientId, newTotalRev, oldTotalRev, newQty, oldClientId, oldSale.inventory_id || null]);
                }
            }
        }

        // 🌟 تطبيق التدقيق المتقدم (Advanced Audit Trail) 🌟
        let oldData = {};
        try {
            const oldRes = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
            if (oldRes.rows.length > 0) oldData = oldRes.rows[0];
        } catch (e) { console.error("Audit Read Old Data Error:", e); }

        const keys = Object.keys(data);
        if (keys.length > 0) {
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const values = Object.values(data);
            await client.query(`UPDATE ${type} SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
        }

        // تسجيل التغييرات بدقة متناهية بدلاً من رسالة عامة
        await logAdvancedAudit(client, req.user.username, type, id, 'UPDATE', `Updated record in ${type}`, oldData, data);

        if (type === 'payment_receipts') {
            const recRes = await client.query("SELECT installment_id FROM payment_receipts WHERE id = $1", [id]);
            if (recRes.rows.length > 0) {
                const instId = recRes.rows[0].installment_id;
                const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [instId]);
                if (instRes.rows.length > 0) {
                    const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                    const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [instId]);
                    const totalPaid = parseFloat(paidSoFarRes.rows[0]?.total || 0);

                    const newStatus = totalPaid >= instAmt ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
                    await client.query("UPDATE installments SET status = $1, paid_amount = $2 WHERE id = $3", [newStatus, totalPaid, instId]);
                }
            }
        }

        if ((type === 'inventory_sales' || type === 'client_consumptions') && data.inventory_id) {
            await checkAndSendLowStockEmail(data.inventory_id);
        }

        if (pNameForSync) await syncProjectFinancials(pNameForSync, client);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API ERROR] PUT /update/${req.params.type}:`, err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.delete('/delete/:type/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { type, id } = req.params;
        const mappedType = (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') ? 'purchase_orders' : (type === 'gl_mappings' ? 'ledger' : type);

        if (!hasAccess(req.user, mappedType, 'delete')) throw new Error("Access Denied.");

        // 🌟 جلب السجل بالكامل قبل الحذف لتسجيله في سجل التدقيق المتقدم (Audit Trail)
        let oldData = {};
        let deletedItemName = id;
        try {
            const preDel = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
            if (preDel.rows.length > 0) {
                oldData = preDel.rows[0];
                deletedItemName = oldData.name || oldData.item_name || oldData.description || id;
            }
        } catch (e) { console.error("Audit Read Old Data Error on Delete:", e.message); }

        if (type === 'material_usage') {
            const old = await client.query("SELECT material, qty FROM material_usage WHERE id = $1", [id]);
            if (old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) + $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
        }

        if (type === 'inventory_sales') {
            const old = await client.query("SELECT * FROM inventory_sales WHERE id = $1", [id]);
            if (old.rows.length > 0) {
                const sale = old.rows[0];
                await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [sale.qty, sale.inventory_id]);

                const custRes = await client.query("SELECT id FROM customers WHERE TRIM(LOWER(name)) = TRIM(LOWER($1))", [sale.customer_name]);
                if (custRes.rows.length > 0) {
                    const clientId = custRes.rows[0].id;
                    const totalRev = parseFloat(sale.sell_price || 0) * parseFloat(sale.qty || 0);

                    await client.query(`
                        DELETE FROM client_consumptions 
                        WHERE id IN (
                            SELECT id FROM client_consumptions 
                            WHERE client_id = $1 AND (inventory_id = $2 OR (inventory_id IS NULL AND $2 IS NULL)) 
                            AND consumed_qty = $3 AND total_revenue = $4 
                            LIMIT 1
                        )
                    `, [clientId, sale.inventory_id || null, sale.qty, totalRev]);

                    await client.query(`
                        DELETE FROM client_delayed_payments 
                        WHERE id IN (
                            SELECT id FROM client_delayed_payments 
                            WHERE client_id = $1 AND (inventory_id = $2 OR (inventory_id IS NULL AND $2 IS NULL)) 
                            AND original_amount = $3 
                            LIMIT 1
                        )
                    `, [clientId, sale.inventory_id || null, totalRev]);
                }
            }
        }
        if (type === 'client_consumptions') {
            const old = await client.query("SELECT inventory_id, consumed_qty FROM client_consumptions WHERE id = $1", [id]);
            if (old.rows.length > 0 && parseFloat(old.rows[0]?.consumed_qty || 0) > 0) await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [old.rows[0].consumed_qty, old.rows[0].inventory_id]);
        }
        if (type === 'returns') {
            const old = await client.query("SELECT material, qty FROM returns WHERE id = $1", [id]);
            if (old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) - $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
        }

        if (type === 'payment_receipts') {
            const oldRec = await client.query("SELECT amount, installment_id FROM payment_receipts WHERE id = $1", [id]);
            if (oldRec.rows.length > 0) {
                const installment_id = oldRec.rows[0]?.installment_id;
                await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);

                const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [installment_id]);
                if (instRes.rows.length > 0) {
                    const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                    const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [installment_id]);
                    const totalPaid = parseFloat(paidSoFarRes.rows[0]?.total || 0);
                    const newStatus = totalPaid >= instAmt ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');

                    await client.query("UPDATE installments SET status = $1, paid_amount = $2 WHERE id = $3", [newStatus, totalPaid, installment_id]);
                }
            }
        } else {
            await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);

            // تنبيه بالحذف
            if (['inventory', 'projects'].includes(type)) {
                await client.query(
                    "INSERT INTO system_notifications (type, title, message) VALUES ($1, $2, $3)",
                    [`DELETED_${type.toUpperCase()}`, 'حذف سجل', `تم حذف ${deletedItemName} من ${type} بواسطة ${req.user.username}`]
                );
            }
        }

        // 🌟 تسجيل تفاصيل الحذف بكامل البيانات المفقودة في التدقيق المتقدم
        await logAdvancedAudit(client, req.user.username, type, id, 'DELETE', 'Record Deleted', oldData, null);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API ERROR] DELETE /delete/${req.params.type}:`, err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/delete_bulk/:type', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { type } = req.params;
        const { ids } = req.body;

        let accessType = type;
        if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') accessType = 'purchase_orders';
        if (type === 'gl_mappings') accessType = 'ledger';

        if (!hasAccess(req.user, accessType, 'delete')) throw new Error("Access Denied.");

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new Error("No IDs provided for deletion.");
        }

        for (let id of ids) {
            if (type === 'material_usage') {
                const old = await client.query("SELECT material, qty FROM material_usage WHERE id = $1", [id]);
                if (old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) + $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
            }
            if (type === 'inventory_sales') {
                const saleRes = await client.query("SELECT * FROM inventory_sales WHERE id = $1", [id]);
                if (saleRes.rows.length > 0) {
                    const sale = saleRes.rows[0];
                    const totalRev = parseFloat(sale.sell_price || 0) * parseFloat(sale.qty || 0);

                    await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [sale.qty, sale.inventory_id]);

                    const custRes = await client.query("SELECT id FROM customers WHERE TRIM(LOWER(name)) = TRIM(LOWER($1))", [sale.customer_name]);
                    if (custRes.rows.length > 0) {
                        const clientId = custRes.rows[0].id;

                        await client.query(`
                            DELETE FROM client_consumptions 
                            WHERE id IN (
                                SELECT id FROM client_consumptions 
                                WHERE client_id = $1 AND (inventory_id = $2 OR (inventory_id IS NULL AND $2 IS NULL)) 
                                AND consumed_qty = $3 AND total_revenue = $4 
                                LIMIT 1
                            )
                        `, [clientId, sale.inventory_id || null, sale.qty, totalRev]);

                        await client.query(`
                            DELETE FROM client_delayed_payments 
                            WHERE id IN (
                                SELECT id FROM client_delayed_payments 
                                WHERE client_id = $1 AND (inventory_id = $2 OR (inventory_id IS NULL AND $2 IS NULL)) 
                                AND original_amount = $3 
                                LIMIT 1
                            )
                        `, [clientId, sale.inventory_id || null, totalRev]);
                    }
                }
            }
            if (type === 'client_consumptions') {
                const old = await client.query("SELECT inventory_id, consumed_qty FROM client_consumptions WHERE id = $1", [id]);
                if (old.rows.length > 0 && parseFloat(old.rows[0]?.consumed_qty || 0) > 0) await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [old.rows[0].consumed_qty, old.rows[0].inventory_id]);
            }
            if (type === 'returns') {
                const old = await client.query("SELECT material, qty FROM returns WHERE id = $1", [id]);
                if (old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) - $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
            }

            if (type === 'payment_receipts') {
                const oldRec = await client.query("SELECT amount, installment_id FROM payment_receipts WHERE id = $1", [id]);
                if (oldRec.rows.length > 0) {
                    const installment_id = oldRec.rows[0]?.installment_id;
                    await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);

                    const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [installment_id]);
                    if (instRes.rows.length > 0) {
                        const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                        const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [installment_id]);
                        const totalPaid = parseFloat(paidSoFarRes.rows[0]?.total || 0);
                        const newStatus = totalPaid >= instAmt ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
                        await client.query("UPDATE installments SET status = $1, paid_amount = $2 WHERE id = $3", [newStatus, totalPaid, installment_id]);
                    }
                }
            } else {
                await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]);
            }

            await logAudit(req.user.username, 'BULK_DELETE', type, id, 'Record Deleted via Bulk Action');
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Successfully deleted ${ids.length} records.` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API ERROR] POST /delete_bulk/${req.params.type}:`, err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/action/rfq_to_po/:id', async (req, res) => {
    try {
        if (!hasAccess(req.user, 'purchase_orders', 'create')) return res.status(403).json({ error: "Access Denied." });
        const rfqRes = await pool.query("SELECT * FROM rfq WHERE id = $1", [req.params.id]);
        if (rfqRes.rows.length === 0) return res.status(404).json({ error: "RFQ not found." });
        const rfq = rfqRes.rows[0];
        if (!rfq.status || !rfq.status.includes('Approved')) return res.status(400).json({ error: "RFQ must be approved first." });
        if (!rfq.selected_vendor) return res.status(400).json({ error: "No vendor selected." });

        let estCost = 0; const sv = rfq.selected_vendor.toLowerCase();
        if (rfq.vendor_1 && sv === rfq.vendor_1.toLowerCase()) estCost = rfq.price_1 || 0;
        else if (rfq.vendor_2 && sv === rfq.vendor_2.toLowerCase()) estCost = rfq.price_2 || 0;
        else if (rfq.vendor_3 && sv === rfq.vendor_3.toLowerCase()) estCost = rfq.price_3 || 0;

        const insertRes = await pool.query(
            "INSERT INTO purchase_orders (item_description, qty, estimated_cost, supplier, project_name, status, fx_rate) VALUES ($1, $2, $3, $4, $5, 'Pending', 1) RETURNING id",
            [rfq.item_description, rfq.qty, estCost, rfq.selected_vendor, rfq.project_name]
        );
        await pool.query("UPDATE rfq SET status = 'Converted to PO' WHERE id = $1", [req.params.id]);
        await logAudit(req.user.username, 'CREATE_PO', 'purchase_orders', insertRes.rows[0].id, `Created PO from RFQ #${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error("[API ERROR] POST /action/rfq_to_po:", err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 🌟 مسار استلام أوامر الشراء (GRN) وتحديث المخزون
// ============================================================================
// ============================================================================
// 🌟 مسار استلام أوامر الشراء (GRN) وتحديث المخزون
// ============================================================================
// ============================================================================
// 🌟 مسار استلام أوامر الشراء (GRN) وتحديث المخزون
// ============================================================================
router.post('/action/receive_po/:id', authenticateToken, purchaseController.receivePO);

// ============================================================================
// 🌟 مسار إعادة استلام أوامر الشراء (Re-receive PO)
// ============================================================================
router.post('/action/rereceive_po/:id', authenticateToken, purchaseController.reReceivePO);
router.get('/mpo-360/:mpo', authenticateToken, purchaseController.getMPO360);
router.post('/action/repost_to_client/:id', async (req, res) => {
    try {
        const saleId = req.params.id;

        const saleRes = await pool.query("SELECT * FROM inventory_sales WHERE id = $1", [saleId]);
        if (saleRes.rows.length === 0) return res.status(404).json({ error: "المعاملة غير موجودة" });

        const sale = saleRes.rows[0];

        const custRes = await pool.query("SELECT id FROM customers WHERE name = $1", [sale.customer_name]);
        if (custRes.rows.length === 0) return res.status(404).json({ error: "العميل غير مسجل في قاعدة البيانات بشكل صحيح" });

        const clientId = custRes.rows[0].id;
        const totalRev = parseFloat(sale.sell_price || 0) * parseFloat(sale.qty || 0);

        await pool.query(
            "INSERT INTO client_consumptions (client_id, inventory_id, consumed_qty, paid_amount, outstanding_balance, outstanding_date, created_by, total_revenue) VALUES ($1, $2, $3, 0, $4, $5, $6, $7)",
            [clientId, sale.inventory_id || null, sale.qty, totalRev, sale.date, 'System-Repost', totalRev]
        );
        if (totalRev > 0) {
            await pool.query(
                "INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, 0)",
                [clientId, totalRev, totalRev, sale.date, sale.inventory_id || null, sale.qty]
            );
        }
        res.json({ success: true, message: 'تم الترحيل بنجاح' });
    } catch (err) {
        console.error("[API ERROR] POST /action/repost_to_client:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/action/generate_installments', async (req, res) => {
    try {
        if (!hasAccess(req.user, 'installments', 'create')) return res.status(403).json({ error: "Access Denied." });

        const { contract_id, years, frequency, start_date, penalty_days, penalty_amount } = req.body;

        const contractRes = await pool.query("SELECT * FROM contracts WHERE id = $1", [contract_id]);
        if (contractRes.rows.length === 0) return res.status(404).json({ error: "Contract not found." });
        const contract = contractRes.rows[0];

        let unitNum = '';
        if (contract.unit_id) {
            const unitRes = await pool.query("SELECT unit_number FROM property_units WHERE id = $1", [contract.unit_id]);
            if (unitRes.rows.length > 0) unitNum = unitRes.rows[0].unit_number;
        }

        const totalVal = parseFloat(contract.total_value) || 0;
        const downPay = parseFloat(contract.down_payment) || 0;
        const remaining = totalVal - downPay;

        let numPayments = 0;
        let monthStep = 0;
        if (frequency === 'Monthly') { numPayments = years * 12; monthStep = 1; }
        else if (frequency === 'Quarterly') { numPayments = years * 4; monthStep = 3; }
        else if (frequency === 'Semi-Annually') { numPayments = years * 2; monthStep = 6; }
        else if (frequency === 'Yearly') { numPayments = years * 1; monthStep = 12; }

        if (numPayments === 0) return res.status(400).json({ error: "Invalid years or frequency." });

        const amountPer = remaining / numPayments;
        let currDate = new Date(start_date);

        for (let i = 1; i <= numPayments; i++) {
            await pool.query(
                `INSERT INTO installments 
                (contract_id, installment_no, unit_number, due_date, amount, status, penalty_rate) 
                VALUES ($1, $2, $3, $4, $5, 'Pending', $6)`,
                [contract.id, i.toString(), unitNum, currDate.toISOString(), amountPer, penalty_amount || 0.05]
            );
            currDate.setMonth(currDate.getMonth() + monthStep);
        }

        await logAudit(req.user.username, 'CREATE', 'installments', contract.id, `Generated ${numPayments} installments with penalty config`);
        res.json({ success: true, generated_count: numPayments });
    } catch (err) {
        console.error("[API ERROR] POST /action/generate_installments:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/installments/pay', async (req, res) => {
    let currentUser = req.user;
    if (!currentUser) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Unauthorized: Missing Token" });
        try {
            const jwt = require('jsonwebtoken');
            currentUser = jwt.verify(token, process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2');
            req.user = currentUser;
        } catch (err) {
            return res.status(403).json({ error: "Invalid Token" });
        }
    }

    const { installmentId, paymentAmount, waivePenalty } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const instRes = await client.query(`SELECT i.*, cu.email, cu.name as customer_name FROM installments i JOIN contracts c ON i.contract_id = c.id JOIN customers cu ON c.customer_id = cu.id WHERE i.id = $1`, [installmentId]);
        if (instRes.rows.length === 0) {
            throw new Error("القسط غير موجود");
        }

        const installment = instRes.rows[0];
        let penalty = 0;
        const today = new Date();
        const dueDate = new Date(installment.due_date);

        if (today > dueDate && installment.status !== 'Paid') {
            const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            penalty = installment.amount * (installment.penalty_rate || 0.05) * (daysLate / 30);
        }

        if (waivePenalty && currentUser.role !== 'Admin') {
            throw new Error("لا تملك صلاحية إعفاء الغرامة. يجب الحصول على موافقة السلطة الأعلى (Admin).");
        }

        const finalAmount = waivePenalty ? parseFloat(paymentAmount) : (parseFloat(paymentAmount) + penalty);

        const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [installmentId]);
        const totalPaid = parseFloat(paidSoFarRes.rows[0]?.total || 0) + parseFloat(paymentAmount || 0);
        const totalAmount = parseFloat(installment?.amount || 0);

        let newStatus = 'Pending';
        if (totalPaid >= totalAmount) {
            newStatus = 'Paid';
        } else if (totalPaid > 0) {
            newStatus = 'Partial';
        }

        await client.query(
            `UPDATE installments SET paid_amount = $1, status = $2 WHERE id = $3`,
            [totalPaid, newStatus, installmentId]
        );

        await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', installment.project_name || 'General', finalAmount, 0, `سداد قسط عقاري للعميل: ${installment.customer_name}${waivePenalty ? ' (إعفاء غرامة)' : ''}`, currentUser.username);
        await autoLedgerEntry(client, 'العملاء', installment.project_name || 'General', 0, finalAmount, `سداد قسط عقاري للعميل: ${installment.customer_name}${waivePenalty ? ' (إعفاء غرامة)' : ''}`, currentUser.username);
        await logAdvancedAudit(client, currentUser.username, 'installments', installmentId, 'PAYMENT', `Paid ${paymentAmount} with penalty ${waivePenalty ? 0 : penalty}`);

        try {
            const configRes = await client.query("SELECT is_active FROM email_triggers_config WHERE trigger_type = 'payment_confirmation'");
            if (configRes.rows.length > 0 && configRes.rows[0].is_active && installment.email) {
                const remaining = Math.max(0, totalAmount - totalPaid);
                const msg = `عزيزي ${installment.customer_name}،\nنؤكد استلام دفعتكم بقيمة ${paymentAmount} ج.م بنجاح.\nالمبلغ المتبقي من هذا القسط: ${remaining} ج.م.\nنشكركم لتعاملكم معنا.`;
                await sendEmailNotification(installment.email, 'تأكيد استلام دفعة مالية', msg, true);
            }
        } catch (emailErr) { console.error("Payment Email Error:", emailErr); }

        await client.query('COMMIT');
        res.status(200).json({
            message: "تم تزامن السداد وتحديث حالة القسط والميزانية بنجاح",
            newStatus: newStatus
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] Error processing installment payment:", error);
        res.status(500).json({ message: error.message || "حدث خطأ في الخادم أثناء تسجيل وتزامن حالة الدفعة" });
    } finally {
        client.release();
    }
});

router.get('/staff/payroll-summary/:month/:year', authenticateToken, payrollController.getPayrollSummary);
router.post('/staff/payroll', authenticateToken, payrollController.processPayroll);

router.post(['/pay-delayed-balance', '/action/pay-delayed-balance'], async (req, res) => {
    const { client_id, amount_paid, debt_id, payment_method, reference_no, cheque_date, bank_name, notes } = req.body;
    let remainingPayment = parseFloat(amount_paid || 0);

    if (!client_id || !remainingPayment || remainingPayment <= 0) return res.status(400).json({ error: "المبلغ المدفوع غير صحيح." });

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let pendingDebts;
        if (debt_id) {
            // سداد مباشر لفاتورة/معاملة محددة
            pendingDebts = await client.query(
                "SELECT * FROM client_delayed_payments WHERE id = $1 AND client_id = $2 AND status != 'Paid' AND amount > 0",
                [debt_id, client_id]
            );
        } else {
            // سداد شامل يتم توزيعه آلياً من الأقدم للأحدث (FIFO)
            pendingDebts = await client.query(
                "SELECT * FROM client_delayed_payments WHERE client_id = $1 AND status != 'Paid' AND amount > 0 ORDER BY due_date ASC",
                [client_id]
            );
        }

        for (let debt of pendingDebts.rows) {
            if (remainingPayment <= 0) break;
            if (!debt) continue;

            let debtAmount = parseFloat(debt.amount || 0);
            let paidForThisDebt = 0;
            let newStatus = 'Pending';

            // تخصيص المبلغ المتاح لهذه الفاتورة
            if (remainingPayment >= debtAmount) {
                paidForThisDebt = debtAmount;
                remainingPayment -= debtAmount;
                newStatus = 'Paid';
            } else {
                paidForThisDebt = remainingPayment;
                remainingPayment = 0;
                newStatus = 'Partial';
            }

            const newPaidTotal = parseFloat(debt.paid_amount || 0) + paidForThisDebt;
            const newAmount = debtAmount - paidForThisDebt;
            const newHistory = {
                payment_date: new Date().toISOString(),
                amount_paid: paidForThisDebt,
                payment_method: payment_method || 'Cash',
                reference_no: reference_no || '',
                cheque_date: cheque_date || '',
                bank_name: bank_name || '',
                notes: notes || ''
            };

            // 1. تحديث رصيد الفاتورة
            await client.query(`
                UPDATE client_delayed_payments 
                SET amount = $1, paid_amount = $2, status = $3, last_payment_date = CURRENT_DATE,
                    payment_history = COALESCE(payment_history, '[]'::jsonb) || $4::jsonb
                WHERE id = $5
            `, [newAmount, newPaidTotal, newStatus, JSON.stringify(newHistory), debt.id]);

            // 2. تسجيل الإيصال في الخزينة (واسترجاع الـ ID الخاص به)
            const paymentHistoryRes = await client.query(
                "INSERT INTO client_payment_history (client_id, delayed_payment_id, amount_paid, payment_date, payment_method, reference_no, notes) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6) RETURNING id",
                [client_id, debt.id, paidForThisDebt, payment_method || 'Cash', reference_no || '', notes || '']
            );
            const newPaymentId = paymentHistoryRes.rows[0].id;

            // 3. 🌟 السحر هنا: تسجيل التخصيص الدقيق للربط بين الفاتورة والمدفوعات 🌟
            await client.query(
                "INSERT INTO payment_allocations (payment_id, debt_id, allocated_amount) VALUES ($1, $2, $3)",
                [newPaymentId, debt.id, paidForThisDebt]
            );

            if (paidForThisDebt > 0) {
                // 4. تحديث فاتورة الاستهلاك الأصلية لتتطابق مع التحصيلات
                if (debt.consumption_id) {
                    await client.query("UPDATE client_consumptions SET paid_amount = paid_amount + $1, outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2", [paidForThisDebt, debt.consumption_id]);
                } else {
                    await client.query(`
                        UPDATE client_consumptions
                        SET paid_amount = paid_amount + $1, outstanding_balance = GREATEST(0, outstanding_balance - $1)
                        WHERE id IN (
                            SELECT id FROM client_consumptions 
                            WHERE client_id = $2 AND (inventory_id = $3 OR (inventory_id IS NULL AND $3 IS NULL)) 
                            AND outstanding_balance > 0
                            ORDER BY outstanding_date ASC LIMIT 1
                        )
                    `, [paidForThisDebt, client_id, debt.inventory_id || null]);
                }

                // 5. التسميع الآلي في دفتر الأستاذ (GL) وتوليد القيود
                const pmMethodStr = payment_method ? ` (${payment_method})` : '';
                await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', 'General', paidForThisDebt, 0, `سداد مديونية تخص المعاملة #${debt.id} للعميل رقم ${client_id}${pmMethodStr}`, req.user ? req.user.username : 'System');
                await autoLedgerEntry(client, 'العملاء', 'General', 0, paidForThisDebt, `سداد مديونية تخص المعاملة #${debt.id} للعميل رقم ${client_id}${pmMethodStr}`, req.user ? req.user.username : 'System');
            }
        }

        // --- إيداع الفائض (Overpayment) في محفظة العميل (Client Wallet) كدفعة مقدمة وتسجيل قيودها ---
        if (remainingPayment > 0 && !debt_id) {
            await client.query("UPDATE customers SET credit_balance = COALESCE(credit_balance, 0) + $1 WHERE id = $2", [remainingPayment, client_id]);
            const pmMethodStr = payment_method ? ` (${payment_method})` : '';
            await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', 'General', remainingPayment, 0, `فائض سداد يُضاف لرصيد العميل رقم ${client_id}${pmMethodStr}`, req.user ? req.user.username : 'System');
            await autoLedgerEntry(client, 'دفعات مقدمة من العملاء', 'General', 0, remainingPayment, `فائض سداد يُضاف لرصيد العميل رقم ${client_id}${pmMethodStr}`, req.user ? req.user.username : 'System');
        }

        await client.query("COMMIT");

        // 🌟 دمج الـ Webhook: إرسال إشعار لحظي لأنظمة خارجية (مثل WhatsApp Gateway أو CRM)
        dispatchWebhook('payment_received', {
            client_id,
            amount_paid,
            payment_method,
            reference_no,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: "تم تخصيص وتوزيع السداد بنجاح مع إضافة القيود المحاسبية." });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("[API ERROR] Error POST /pay-delayed-balance:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});
router.get('/delayed-payments/:client_id', async (req, res) => {
    try {
        if (!req.params.client_id || req.params.client_id === 'null' || req.params.client_id === 'undefined') {
            return res.json([]);
        }

        await pool.query("UPDATE client_delayed_payments SET original_amount = amount + COALESCE(paid_amount, 0) WHERE original_amount IS NULL");

        const result = await pool.query(`
            SELECT d.*, i.name as inventory_name 
            FROM client_delayed_payments d 
            LEFT JOIN inventory i ON d.inventory_id = i.id 
            WHERE d.client_id = $1 
            ORDER BY d.due_date ASC`,
            [req.params.client_id]);

        res.json(result.rows);
    } catch (err) {
        console.error("[API ERROR] Error GET /delayed-payments:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/action/schedule_debt', async (req, res) => {
    const { client_id, inventory_id, schedules, method, reference } = req.body;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // التحقق الأمني من أن مجموع الأقساط يساوي المديونية الأصلية بدقة
        let totalScheduled = 0;
        for (let s of schedules) {
            totalScheduled += parseFloat(s.amount || 0);
        }

        const debtRes = await client.query("SELECT SUM(amount) as total_debt FROM client_delayed_payments WHERE client_id = $1 AND (inventory_id = $2 OR (inventory_id IS NULL AND $2 IS NULL)) AND status != 'Paid'", [client_id, inventory_id || null]);
        const originalTotal = parseFloat(debtRes.rows[0]?.total_debt || 0);

        if (Math.abs(totalScheduled - originalTotal) > 0.1) {
            throw new Error(`إجمالي الأقساط المجدولة (${totalScheduled}) لا يتطابق مع إجمالي المديونية المستحقة (${originalTotal}).`);
        }

        await client.query("DELETE FROM client_delayed_payments WHERE client_id = $1 AND (inventory_id = $2 OR (inventory_id IS NULL AND $2 IS NULL)) AND status != 'Paid'", [client_id, inventory_id || null]);

        for (let s of schedules) {
            if (s?.amount && s?.date) {
                const hist = JSON.stringify([{ method: s.method || method || 'Transfer', reference: s.reference || reference || '' }]);
                await client.query(
                    "INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount, payment_history) VALUES ($1, $2, $3, $4, $5, 0, 0, $6::jsonb)",
                    [client_id, s.amount, s.amount, s.date, inventory_id || null, hist]
                );
            }
        }
        await client.query("COMMIT");
        res.json({ success: true, message: "تم حفظ الجدولة بنجاح" });
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("[API ERROR] Error POST /action/schedule_debt:", e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/system/email_config', requireAdmin, async (req, res) => {
    const { triggers } = req.body;
    try {
        for (let t of triggers) {
            await pool.query("INSERT INTO email_triggers_config (trigger_type, is_active) VALUES ($1, $2) ON CONFLICT (trigger_type) DO UPDATE SET is_active = EXCLUDED.is_active", [t.type, t.active]);
        }
        res.json({ success: true });
    } catch (e) {
        console.error("[API ERROR] Error POST /system/email_config:", e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/installments/pay', async (req, res) => {
    let currentUser = req.user;
    if (!currentUser) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Unauthorized: Missing Token" });
        try {
            const jwt = require('jsonwebtoken');
            currentUser = jwt.verify(token, process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2');
            req.user = currentUser;
        } catch (err) {
            return res.status(403).json({ error: "Invalid Token" });
        }
    }

    const { installmentId, paymentAmount, waivePenalty } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const instRes = await client.query(`SELECT i.*, cu.email, cu.name as customer_name FROM installments i JOIN contracts c ON i.contract_id = c.id JOIN customers cu ON c.customer_id = cu.id WHERE i.id = $1`, [installmentId]);
        if (instRes.rows.length === 0) {
            throw new Error("القسط غير موجود");
        }

        const installment = instRes.rows[0];

        let penalty = 0;
        const today = new Date();
        const dueDate = new Date(installment.due_date);

        if (today > dueDate && installment.status !== 'Paid') {
            const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            penalty = installment.amount * (installment.penalty_rate || 0.05) * (daysLate / 30);
        }

        if (waivePenalty && currentUser.role !== 'Admin') {
            throw new Error("لا تملك صلاحية إعفاء الغرامة. يجب الحصول على موافقة السلطة الأعلى (Admin).");
        }

        const finalAmount = waivePenalty ? parseFloat(paymentAmount) : (parseFloat(paymentAmount) + penalty);

        const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [installmentId]);
        const totalPaid = parseFloat(paidSoFarRes.rows[0]?.total || 0) + parseFloat(paymentAmount || 0);
        const totalAmount = parseFloat(installment?.amount || 0);

        let newStatus = 'Pending';
        if (totalPaid >= totalAmount) {
            newStatus = 'Paid';
        } else if (totalPaid > 0) {
            newStatus = 'Partial';
        }

        await client.query(
            `UPDATE installments SET paid_amount = $1, status = $2 WHERE id = $3`,
            [totalPaid, newStatus, installmentId]
        );

        // تسجيل قيود استلام الأقساط بشكل آمن عبر Transaction
        await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', installment.project_name || 'General', finalAmount, 0, `سداد قسط عقاري للعميل: ${installment.customer_name}${waivePenalty ? ' (إعفاء غرامة)' : ''}`, currentUser.username);
        await autoLedgerEntry(client, 'العملاء', installment.project_name || 'General', 0, finalAmount, `سداد قسط عقاري للعميل: ${installment.customer_name}${waivePenalty ? ' (إعفاء غرامة)' : ''}`, currentUser.username);

        await logAudit(currentUser.username, 'PAYMENT', 'installments', installmentId, `Paid ${paymentAmount} with penalty ${waivePenalty ? 0 : penalty}`);

        try {
            const configRes = await client.query("SELECT is_active FROM email_triggers_config WHERE trigger_type = 'payment_confirmation'");
            if (configRes.rows.length > 0 && configRes.rows[0].is_active && installment.email) {
                const remaining = Math.max(0, totalAmount - totalPaid);
                const msg = `عزيزي ${installment.customer_name}،\nنؤكد استلام دفعتكم بقيمة ${paymentAmount} ج.م بنجاح.\nالمبلغ المتبقي من هذا القسط: ${remaining} ج.م.\nنشكركم لتعاملكم معنا.`;
                await sendEmailNotification(installment.email, 'تأكيد استلام دفعة مالية', msg, true);
            }
        } catch (emailErr) { console.error("Payment Email Error:", emailErr); }

        await client.query('COMMIT');
        res.status(200).json({
            message: "تم تزامن السداد وتحديث حالة القسط والميزانية بنجاح",
            newStatus: newStatus
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] Error processing installment payment:", error);
        res.status(500).json({ message: error.message || "حدث خطأ في الخادم أثناء تسجيل وتزامن حالة الدفعة" });
    } finally {
        client.release();
    }
});

// ============================================================================
// مسار جلب سجل مدفوعات العميل (Payment History)
// ============================================================================
router.get('/client-payment-history/:client_id', async (req, res) => {
    try {
        const query = `
            SELECT 
                cph.id, 
                cph.amount_paid, 
                cph.payment_date, 
                cdp.original_amount as debt_amount,
                i.item_name as item_name
            FROM client_payment_history cph
            LEFT JOIN client_delayed_payments cdp ON cph.delayed_payment_id = cdp.id
            LEFT JOIN inventory_items i ON cdp.inventory_id = i.id
            WHERE cph.client_id = $1
            ORDER BY cph.payment_date DESC, cph.id DESC
        `;
        const result = await pool.query(query, [req.params.client_id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("[API ERROR] GET /client-payment-history:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/action/fulfill_preorder/:id', async (req, res) => {
    const preOrderId = req.params.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const preOrderRes = await client.query(
            `UPDATE client_preorders SET status = 'Fulfilled' WHERE id = $1 AND status = 'Pending' RETURNING *`,
            [preOrderId]
        );

        if (preOrderRes.rows.length === 0) throw new Error("الحجز غير موجود أو تم تسليمه مسبقاً.");
        const preOrder = preOrderRes.rows[0];

        const invRes = await client.query('SELECT id FROM inventory_items WHERE po_id::text = $1::text LIMIT 1', [preOrder.po_id]);
        if (invRes.rows.length === 0) throw new Error("لا يمكن التسليم! البضاعة الخاصة بهذا الحجز لم يتم استلامها في المخزن بعد.");
        const inventoryId = invRes.rows[0].id;

        const poRes = await client.query('SELECT * FROM purchase_orders WHERE id = $1', [preOrder.po_id]);
        const poDetails = poRes.rows[0] || {};
        const custRes = await client.query('SELECT name, email FROM customers WHERE id = $1', [preOrder.client_id]);
        const customerName = custRes.rows[0] ? custRes.rows[0].name : ('Client ID: ' + preOrder.client_id);
        const customerEmail = custRes.rows[0] ? custRes.rows[0].email : null;

        const buyPricePerUnit = Number(poDetails.estimated_cost) || 0;
        const todayDate = new Date().toISOString().split('T')[0];
        const itemName = poDetails.item_description || poDetails.item_name || 'صنف غير محدد';
        const projectName = poDetails.project_name || 'General';

        const totalRevAmount = Number(preOrder.reserved_qty) * Number(preOrder.unit_price);
        const advancePaid = Number(preOrder.advance_payment);

        const excessAmount = Math.max(0, advancePaid - totalRevAmount);
        const debtRemaining = Math.max(0, totalRevAmount - advancePaid);

        let usedExcess = 0;

        if (excessAmount > 0) {
            let remainingForDebts = excessAmount;
            const pendingDebts = await client.query(
                "SELECT * FROM client_delayed_payments WHERE client_id = $1 AND status != 'Paid' AND amount > 0 ORDER BY due_date ASC",
                [preOrder.client_id]
            );

            for (let debt of pendingDebts.rows) {
                if (remainingForDebts <= 0) break;

                let debtAmt = parseFloat(debt.amount);
                let payAmt = Math.min(debtAmt, remainingForDebts);
                remainingForDebts -= payAmt;
                usedExcess += payAmt;

                let newAmt = debtAmt - payAmt;
                let newStatus = newAmt <= 0 ? 'Paid' : 'Partial';
                let newPaid = parseFloat(debt.paid_amount || 0) + payAmt;

                let historyObj = {
                    payment_date: new Date().toISOString(),
                    amount_paid: payAmt,
                    note: 'سداد آلي من فائض دفعة مقدمة'
                };

                await client.query(`
                    UPDATE client_delayed_payments 
                    SET amount = $1, paid_amount = $2, status = $3, last_payment_date = CURRENT_DATE,
                    payment_history = COALESCE(payment_history, '[]'::jsonb) || $4::jsonb
                    WHERE id = $5
                `, [newAmt, newPaid, newStatus, JSON.stringify(historyObj), debt.id]);

                await client.query("INSERT INTO client_payment_history (client_id, delayed_payment_id, amount_paid, payment_date) VALUES ($1, $2, $3, CURRENT_DATE)", [preOrder.client_id, debt.id, payAmt]);

                if (debt.consumption_id) {
                    await client.query(`
                        UPDATE client_consumptions
                        SET paid_amount = paid_amount + $1, outstanding_balance = GREATEST(0, outstanding_balance - $1)
                        WHERE id = $2
                    `, [payAmt, debt.consumption_id]);
                } else {
                    await client.query(`
                        UPDATE client_consumptions
                        SET paid_amount = paid_amount + $1, outstanding_balance = GREATEST(0, outstanding_balance - $1)
                        WHERE id IN (SELECT id FROM client_consumptions WHERE client_id = $2 AND (inventory_id = $3 OR (inventory_id IS NULL AND $3 IS NULL)) ORDER BY id DESC LIMIT 1)
                    `, [payAmt, preOrder.client_id, debt.inventory_id || null]);
                }
            }
        }

        const remainingExcess = excessAmount - usedExcess;
        const paidForThisItem = Math.min(advancePaid, totalRevAmount) + remainingExcess;

        const insertSaleQuery = `
            INSERT INTO inventory_sales 
            (inventory_id, date, customer_name, project_name, item_name, qty, buy_price, sell_price, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await client.query(insertSaleQuery, [
            inventoryId, todayDate, customerName, projectName, itemName,
            preOrder.reserved_qty, buyPricePerUnit, preOrder.unit_price, 'System-PreOrder'
        ]);

        await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2", [preOrder.reserved_qty, inventoryId]);

        const ccRes = await client.query(`
            INSERT INTO client_consumptions (client_id, inventory_id, consumed_qty, paid_amount, outstanding_balance, outstanding_date, total_revenue, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [preOrder.client_id, inventoryId, preOrder.reserved_qty, paidForThisItem, debtRemaining, todayDate, totalRevAmount, 'System-PreOrder']
        );
        const ccId = ccRes.rows[0].id;

        if (debtRemaining > 0) {
            await client.query(
                `INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount, status, consumption_id) 
                 VALUES ($1, $2, $2, $3, $4, $5, 0, 'Pending', $6)`,
                [preOrder.client_id, debtRemaining, todayDate, inventoryId, preOrder.reserved_qty, ccId]
            );
        }

        if (remainingExcess > 0) {
            await client.query("UPDATE customers SET credit_balance = COALESCE(credit_balance, 0) + $1 WHERE id = $2", [remainingExcess, preOrder.client_id]);
        }

        // --- Pre-order Fulfilled Email Trigger ---
        try {
            const configRes = await client.query("SELECT is_active FROM email_triggers_config WHERE trigger_type = 'preorder_fulfilled'");
            if (configRes.rows.length > 0 && configRes.rows[0].is_active && customerEmail) {
                const msg = `عزيزي ${customerName}،\nيسعدنا إبلاغك بأن بضاعتك المحجوزة (الصنف: ${itemName}، الكمية: ${preOrder.reserved_qty}) أصبحت جاهزة وتم تأكيد حجزها نهائياً وجاهزة للتسليم.\nشكراً لتعاملكم معنا.`;
                await sendEmailNotification(customerEmail, 'تأكيد جاهزية البضاعة المحجوزة', msg, true);
            }
        } catch (emailErr) { console.error("Preorder Email Error:", emailErr); }

        await client.query('COMMIT');
        res.json({ success: true, message: "تم التسليم بنجاح، ودمج الرصيد الدائن داخل العملية الأصلية." });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Fulfillment Error:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// ============================================================================
// مسارات التنبيهات (Notifications & System Alerts)
// ============================================================================
router.get('/notifications', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 50");
        const unreadCount = await pool.query("SELECT COUNT(*) FROM system_notifications WHERE is_read = FALSE");
        res.json({ success: true, data: result.rows, unread: parseInt(unreadCount.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/notifications/read/:id', async (req, res) => {
    try {
        if (req.params.id === 'all') {
            await pool.query("UPDATE system_notifications SET is_read = TRUE WHERE is_read = FALSE");
        } else {
            await pool.query("UPDATE system_notifications SET is_read = TRUE WHERE id = $1", [req.params.id]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// مسار يمكن استدعاؤه جدولياً لفحص اقتراب الأقساط ونقص المخزون/الموارد (Cron Check)
router.post('/system/run-alerts', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. فحص واستخراج تنبيهات نقص واستنزاف المخزون
        const lowStock = await pool.query("SELECT id, name, remaining_qty FROM inventory WHERE remaining_qty <= 10"); // افترضنا أن 10 هو الحد الأدنى
        for (let item of lowStock.rows) {
            const check = await pool.query("SELECT id FROM system_notifications WHERE type = 'LOW_STOCK' AND link = $1 AND is_read = FALSE", [`/inventory/${item.id}`]);
            if (check.rows.length === 0) {
                await client.query(
                    "INSERT INTO system_notifications (type, title, message, link) VALUES ('LOW_STOCK', 'تنبيه استنزاف/نقص مخزون', $1, $2)",
                    [`المورد/الصنف ${item.name} قارب على النفاذ، المتبقي (${item.remaining_qty})`, `/inventory/${item.id}`]
                );
            }
        }

        // 2. فحص الأقساط المقتربة (خلال 7 أيام القادمة)
        const upcomingInstallments = await pool.query(`
            SELECT i.id, i.installment_no, i.due_date, c.name as customer_name 
            FROM installments i 
            LEFT JOIN contracts ct ON i.contract_id = ct.id 
            LEFT JOIN customers c ON ct.customer_id = c.id 
            WHERE i.status != 'Paid' AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        `);
        for (let inst of upcomingInstallments.rows) {
            const check = await pool.query("SELECT id FROM system_notifications WHERE type = 'UPCOMING_INSTALLMENT' AND link = $1 AND is_read = FALSE", [`/installments/${inst.id}`]);
            if (check.rows.length === 0) {
                const dueDateStr = new Date(inst.due_date).toLocaleDateString('ar-EG');
                await client.query(
                    "INSERT INTO system_notifications (type, title, message, link) VALUES ('UPCOMING_INSTALLMENT', 'اقتراب موعد قسط', $1, $2)",
                    [`قسط العميل ${inst.customer_name} (رقم ${inst.installment_no}) يستحق الدفع بتاريخ ${dueDateStr}`, `/installments/${inst.id}`]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "تم إجراء فحص الموارد والأقساط وتوليد التنبيهات بنجاح." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] POST /system/run-alerts:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================================
// مسارات الحضور والانصراف (Attendance, Geofencing & Batch Upload)
// ============================================================================

// 1. تسجيل الحضور الذاتي الصارم (GPS)
router.post('/attendance/check', authenticateToken, async (req, res) => {
    const { type, lat, lng, project_name } = req.body;
    const staff_id = req.user.id; // 🌟 سحب الـ ID من التوكن الموثق أمنياً
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // إحداثيات افتراضية למشاريع الشركة (في النظام الفعلي تُسحب من جدول Projects)
    const projectCoordinates = {
        'General': { latitude: 30.0444, longitude: 31.2357 },
        'Project A': { latitude: 30.0131, longitude: 31.2089 }
    };

    try {
        const targetLocation = projectCoordinates[project_name];

        if (targetLocation && lat && lng) {
            const distance = geolib.getDistance(
                { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                targetLocation
            );

            if (distance > 50) {
                return res.status(403).json({
                    error: `موقعك الجغرافي بعيد جداً عن الموقع المسموح به. أنت تبعد ${distance} متر، والحد الأقصى 50 متر!`
                });
            }
        }

        const query = `
            INSERT INTO attendance (staff_id, project_name, check_in, location_lat, location_lng, ip_address, status)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, 'Present')
            RETURNING id
        `;

        await pool.query(query, [staff_id, project_name, lat, lng, ip_address]);
        res.json({ message: 'تم تأكيد الحضور أمنياً وتسجيله بنجاح.' });
    } catch (err) {
        console.error("[API ERROR] POST /attendance/check:", err);
        res.status(500).json({ error: 'خطأ داخلي أثناء تسجيل الحضور.' });
    }
});

// 2. الرفع المجمع لبيانات البصمة (CSV Batch Upload)
// ملاحظة هندسية: تم إنشاء متغير localUpload لتجنب التعارض مع متغير upload الموجود في أعلى ملفك
const localUpload = multer({ dest: 'uploads/' });

router.post('/attendance/batch-upload', authenticateToken, localUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'لم يتم استلام أي ملف.' });

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let insertedCount = 0;
                for (const row of results) {
                    const { staff_id, project_name, check_in, check_out } = row;
                    if (staff_id && check_in) {
                        await pool.query(`
                            INSERT INTO attendance (staff_id, project_name, check_in, check_out, status)
                            VALUES ($1, $2, $3, $4, 'Batch Uploaded')
                        `, [staff_id, project_name || 'General', check_in, check_out || null]);
                        insertedCount++;
                    }
                }
                // مسح الملف بعد الانتهاء
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.json({ message: 'تمت معالجة الملف بنجاح', insertedRows: insertedCount });
            } catch (err) {
                console.error("[API ERROR] Batch Upload:", err);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                res.status(500).json({ error: 'حدث خطأ في قاعدة البيانات أثناء حفظ سجلات الحضور.' });
            }
        });
});
// ============================================================================
// 🌟 مسارات الربط الآلي (الغياب + السلف) 
// ============================================================================

// 1. حساب الغياب والخصومات آلياً بناءً على سجل الحضور
router.get('/staff/attendance-summary/:staffId/:month/:year', authenticateToken, async (req, res) => {
    const { staffId, month, year } = req.params;
    try {
        const attRes = await pool.query(`
            SELECT COUNT(DISTINCT DATE(check_in::TIMESTAMP)) as present_days 
            FROM attendance 
            WHERE staff_id = $1::int AND EXTRACT(MONTH FROM check_in::TIMESTAMP) = $2::int AND EXTRACT(YEAR FROM check_in::TIMESTAMP) = $3::int
        `, [staffId, month, year]);

        const presentDays = parseInt(attRes.rows[0].present_days) || 0;
        const expectedDays = 26; // افتراض أن أيام العمل 26 يوماً في الشهر
        const absentDays = Math.max(0, expectedDays - presentDays);

        // حساب قيمة اليوم بناءً على الراتب الأساسي
        const staffRes = await pool.query("SELECT salary FROM staff WHERE id = $1", [staffId]);
        const salary = staffRes.rows.length > 0 ? parseFloat(staffRes.rows[0].salary) : 0;
        const dayValue = salary / 30;
        const suggestedDeduction = absentDays * dayValue;

        res.json({ presentDays, absentDays, suggestedDeduction: Math.round(suggestedDeduction) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "حدث خطأ أثناء حساب الغياب." });
    }
});

// 2. إدارة السلف - طلب سلفة جديدة واعتمادها
router.post('/staff/advance', authenticateToken, payrollController.grantAdvance);

// 3. جلب القسط الشهري المستحق للسلف لخصمه آلياً
router.get('/staff/advance-due/:staffId', authenticateToken, async (req, res) => {
    try {
        const resData = await pool.query(`
            SELECT SUM(LEAST(deduction_per_month, remaining_balance)) as due_amount 
            FROM staff_advances 
            WHERE staff_id = $1::int AND remaining_balance > 0 AND status = 'Approved'
        `, [req.params.staffId]);
        res.json({ due_amount: parseFloat(resData.rows[0].due_amount || 0) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "خطأ في جلب بيانات السلف." });
    }
});
// ============================================================================
// 🌟 مسار التكلفة الواصلة (Landed Cost Allocation)
// ============================================================================
// ============================================================================
// 🌟 مسار التكلفة الواصلة (Landed Cost Allocation)
// ============================================================================
router.post('/inventory/allocate-expense', authenticateToken, async (req, res) => {
    const { po_id, master_po_no, allocation_type, expense_name, amount, currency, exchange_rate, fx_rate } = req.body;
    const currentUser = req.user ? req.user.username : 'System';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS po_expenses (
                id SERIAL PRIMARY KEY,
                po_id VARCHAR(50),
                master_po_no VARCHAR(50),
                allocation_type VARCHAR(20),
                expense_name VARCHAR(255),
                amount DECIMAL(15,2),
                currency VARCHAR(10),
                exchange_rate DECIMAL(15,4),
                local_amount DECIMAL(15,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const rate = parseFloat(fx_rate || exchange_rate || 1);
        const localAmount = parseFloat(amount) * rate;

        await client.query(`
            INSERT INTO po_expenses (po_id, master_po_no, allocation_type, expense_name, amount, currency, exchange_rate, local_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [po_id || null, master_po_no || null, allocation_type || 'single', expense_name, amount, currency, rate, localAmount]);

        // Query items based on allocation type
        let invRes;
        if (allocation_type === 'master' && master_po_no) {
            invRes = await client.query("SELECT id, quantity, buy_price FROM inventory_items WHERE master_po_no = $1", [master_po_no]);
        } else {
            invRes = await client.query("SELECT id, quantity, buy_price FROM inventory_items WHERE po_id::text = $1::text", [po_id]);
        }

        if (invRes.rows.length > 0) {
            const totalValue = invRes.rows.reduce((sum, item) => sum + (parseFloat(item.quantity || 1) * parseFloat(item.buy_price || 0)), 0);

            for (const item of invRes.rows) {
                const itemValue = parseFloat(item.quantity || 1) * parseFloat(item.buy_price || 0);
                const itemExpenseShare = totalValue > 0 ? (itemValue / totalValue) * localAmount : 0;
                const additionalCostPerUnit = (parseFloat(item.quantity || 1) > 0) ? (itemExpenseShare / parseFloat(item.quantity || 1)) : 0;

                // Update Stock record
                await client.query(`
                    UPDATE inventory_items 
                    SET avg_cost = COALESCE(avg_cost, buy_price) + $1 
                    WHERE id = $2
                `, [additionalCostPerUnit, item.id]);

                // Update Procurement record (Purchase Order)
                // We assume there is a 1:1 or 1:N link via po_id (stored as po_id in inventory_items)
                await client.query(`
                    UPDATE purchase_orders 
                    SET unit_cost_after_ddp = COALESCE(unit_cost_after_ddp, estimated_cost * lcy_fx_rate) + $1,
                        lcy_total = COALESCE(lcy_total, qty * estimated_cost * lcy_fx_rate) + $2
                    WHERE id = (SELECT po_id FROM inventory_items WHERE id = $3)
                `, [additionalCostPerUnit, itemExpenseShare, item.id]);
            }
        }

        const refLabel = allocation_type === 'master' ? `MPO#${master_po_no}` : `PO#${po_id}`;
        await autoLedgerEntry(client, 'مخزون الخامات والبضائع', 'General', localAmount, 0, `تحميل مصروف (${expense_name}) على المخزون ${refLabel}`, currentUser);
        await autoLedgerEntry(client, 'مستحقات موردين خدمات ومخلصين', 'General', 0, localAmount, `استحقاق مصروف (${expense_name}) ${refLabel}`, currentUser);

        await client.query('COMMIT');
        res.json({ success: true, message: "تم تحميل المصروف وتوزيع التكلفة على الأصناف بنجاح." });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] Error allocating landed cost:", e);
        res.status(500).json({ error: "حدث خطأ أثناء تحميل المصروف على المخزون." });
    } finally {
        client.release();
    }
});
// ==========================================
// 🌟 مسارات العقارات (Real Estate) - Phase 6
// ==========================================
router.post('/real-estate/projects', authenticateToken, realEstateController.addProject);
router.post('/real-estate/units', authenticateToken, realEstateController.addUnit);
router.post('/real-estate/contracts', authenticateToken, realEstateController.createContract);

router.post('/finance/close-period', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.body;
        await pool.query(`
            INSERT INTO fiscal_periods (year, month, status, closed_at, closed_by) 
            VALUES ($1, $2, 'Closed', CURRENT_TIMESTAMP, $3)
            ON CONFLICT (year, month) DO UPDATE SET status = 'Closed', closed_at = CURRENT_TIMESTAMP, closed_by = EXCLUDED.closed_by
        `, [year, month, req.user.username]);
        res.json({ message: `تم إقفال الفترة ${month}/${year} بنجاح.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 📊 تحميل ميزان المراجعة (Upload Trial Balance as JV)
router.post('/finance/upload-trial-balance', authenticateToken, async (req, res) => {
    try {
        const { rows, description } = req.body;
        // Rows: [{ account_name, balance, type: 'Debit'|'Credit' }]
        const jvRows = rows.map(r => ({
            account_name: r.account_name,
            debit: r.type === 'Debit' ? r.balance : 0,
            credit: r.type === 'Credit' ? r.balance : 0,
            description: description || 'افتتاح ميزان مراجعة',
            cost_center: 'General'
        }));
        const refNo = await AccountingService.recordBalancedJV(pool, jvRows, req.user.username, req.user);
        res.json({ success: true, referenceNo: refNo, message: "تم تحميل ميزان المراجعة بنجاح." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🏢 توزيع تكاليف مشروع (Cost Allocation)
router.post('/finance/allocate-costs', authenticateToken, async (req, res) => {
    try {
        const { source_account, amount, distributions } = req.body;
        // distributions: [{ project_name, percentage }]
        const jvRows = [];
        // Credit the source
        jvRows.push({ account_name: source_account, debit: 0, credit: amount, description: 'توزيع تكاليف مشتركة', cost_center: 'General' });
        // Debit the projects
        for (const dist of distributions) {
            const distAmount = (amount * (dist.percentage / 100)).toFixed(2);
            jvRows.push({
                account_name: 'تكاليف مواد ومهمات - مشاريع',
                debit: distAmount,
                credit: 0,
                description: `نصيب مشروع ${dist.project_name} من التكاليف المشتركة`,
                cost_center: dist.project_name
            });
        }
        const refNo = await AccountingService.recordBalancedJV(pool, jvRows, req.user.username, req.user);
        res.json({ success: true, referenceNo: refNo, message: "تم توزيع التكاليف على المشاريع بنجاح." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/real-estate/installments/pay', authenticateToken, realEstateController.payInstallment);

// ==========================================
// 🌟 مسارات الشركاء والمستثمرين (Partners) - Phase 6
// ==========================================
router.post('/partners', authenticateToken, partnerController.addPartner);
router.post('/partners/transactions', authenticateToken, partnerController.addTransaction);

// =========================================================================
// 🌟 GLOBAL SEARCH (Command Palette Engine)
// =========================================================================
router.get('/search/global', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ results: [] });
        const term = `%${q}%`;

        const queries = [
            { table: 'customers', label: 'العملاء', path: '/clients', cols: ['name', 'company_name', 'phone'], icon: '👥' },
            { table: 'projects', label: 'المشاريع', path: '/projects', cols: ['name', 'project_manager', 'project_serial'], icon: '🏗️' },
            { table: 'purchase_orders', label: 'أوامر الشراء', path: '/inventory', cols: ['master_po_no', 'item_description', 'supplier'], icon: '🛒' },
            { table: 'inventory_items', label: 'المخزون', path: '/inventory', cols: ['item_name', 'master_po_no'], icon: '📦' },
            { table: 'chart_of_accounts', label: 'دليل الحسابات', path: '/finance', cols: ['account_name', 'account_code'], icon: '💰' }
        ];

        let results = [];
        for (const qry of queries) {
            try {
                const condition = qry.cols.map(col => `CAST(${col} AS TEXT) ILIKE $1`).join(' OR ');
                const sql = `SELECT id, ${qry.cols[0]} as title, '${qry.label}' as category, '${qry.path}' as path, '${qry.icon}' as icon FROM ${qry.table} WHERE ${condition} LIMIT 5`;
                console.log(`[SEARCH DEBUG] Querying ${qry.table} with cols ${qry.cols.join(',')}`);
                const resData = await pool.query(sql, [term]);
                results = [...results, ...resData.rows];
            } catch (queryErr) {
                console.error(`[SEARCH ERROR] Table ${qry.table} failed:`, queryErr.message);
            }
        }

        res.json({ results });
    } catch (err) {
        console.error("Global Search Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
router.get('/hcm/profile', authenticateToken, async (req, res) => {
    try {
        const staff = await pool.query("SELECT * FROM staff WHERE user_id = $1", [req.user.id]);
        if (staff.rows.length === 0) return res.status(404).json({ error: "Profile not linked" });

        const leaves = await pool.query("SELECT * FROM leave_requests WHERE staff_id = $1 ORDER BY created_at DESC", [staff.rows[0].id]);
        const payroll = await pool.query("SELECT * FROM payroll WHERE staff_id = $1 ORDER BY period DESC LIMIT 6", [staff.rows[0].id]);

        res.json({ profile: staff.rows[0], leaves: leaves.rows, payroll: payroll.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/hcm/leaves', authenticateToken, async (req, res) => {
    try {
        const { leave_type, start_date, end_date } = req.body;
        const staff = await pool.query("SELECT id FROM staff WHERE user_id = $1", [req.user.id]);
        if (staff.rows.length === 0) return res.status(404).json({ error: "Profile not linked" });

        await pool.query(
            "INSERT INTO leave_requests (staff_id, leave_type, start_date, end_date) VALUES ($1, $2, $3, $4)",
            [staff.rows[0].id, leave_type, start_date, end_date]
        );
        res.json({ message: "Leave request submitted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// 🌟 FIXED ASSETS MANAGEMENT
// =========================================================================
const { registerAsset, runDepreciation } = require('../controllers/fixedAssetsController');
router.post('/assets/register', authenticateToken, registerAsset);
router.post('/assets/run-depreciation', authenticateToken, runDepreciation);

router.post('/assets/run-depreciation', authenticateToken, runDepreciation);

// =========================================================================
// 🌟 FINANCIAL INTEGRITY & CLOSING
// =========================================================================
router.get('/finance/integrity', authenticateToken, async (req, res) => {
    try {
        const imbalances = await AccountingService.reconcileLedger(pool);
        res.json({ imbalances });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/finance/fix-rounding', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const fixedCount = await AccountingService.autoFixRounding(client, req.user.username);
            await client.query('COMMIT');
            res.json({ message: `تم إصلاح ${fixedCount} من الفروقات البسيطة.` });
        } catch (e) { await client.query('ROLLBACK'); throw e; }
        finally { client.release(); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/finance/journal-voucher', authGuard, async (req, res) => {
    try {
        const { rows } = req.body;
        const refNo = await AccountingService.recordBalancedJV(pool, rows, req.user.username, req.user);
        res.json({ message: "Journal Voucher posted successfully", referenceNo: refNo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/finance/fix-history', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const fixedCount = await AccountingService.fixHistoricalImbalances(client, req.user.username);
            await client.query('COMMIT');
            res.json({ message: `تمت موازنة ${fixedCount} من القيود التاريخية بنجاح.` });
        } catch (e) { await client.query('ROLLBACK'); throw e; }
        finally { client.release(); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/finance/close-period', authenticateToken, async (req, res) => {
    try {
        const { year, month } = req.body;
        await pool.query(
            `INSERT INTO fiscal_periods (year, month, status, closed_by, closed_at) 
             VALUES ($1, $2, 'Closed', $3, CURRENT_TIMESTAMP)
             ON CONFLICT (year, month) DO UPDATE SET status = 'Closed', closed_by = $3, closed_at = CURRENT_TIMESTAMP`,
            [year, month, req.user.username]
        );
        res.json({ message: `تم إغلاق الفترة ${month}-${year} بنجاح.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================================
// 🌟 CUSTOMER INVOICING & SOA
// =========================================================================
const { createInvoice, getClientStatement } = require('../controllers/invoiceController');
router.post('/invoices/create', authenticateToken, createInvoice);
router.get('/clients/:client_id/statement', authenticateToken, getClientStatement);

// =========================================================================
// 🌟 IAM (Identity & Access Management)
// =========================================================================
const {
    getSecurityMetadata, createRole, terminateUserSessions,
    getAllRoles, getAllPermissions, updateRolePermissions,
    assignUserToRole, getOrgUnits, getRolePermissions, createUser
} = require('../controllers/iamController');

router.get('/iam/metadata', authGuard, getSecurityMetadata);
router.get('/iam/roles', authGuard, getAllRoles);
router.get('/iam/roles/:id/permissions', authGuard, getRolePermissions);
router.get('/iam/permissions', authGuard, getAllPermissions);
router.get('/iam/org-units', authGuard, getOrgUnits);

router.post('/iam/users', authGuard, checkPermission('IAM_MANAGE_USERS'), createUser);
router.post('/iam/roles', authGuard, checkPermission('IAM_MANAGE_ROLES'), createRole);
router.post('/iam/roles/permissions', authGuard, checkPermission('IAM_MANAGE_ROLES'), updateRolePermissions);
router.post('/iam/users/assign-role', authGuard, checkPermission('IAM_MANAGE_ROLES'), assignUserToRole);
router.post('/iam/sessions/terminate', authGuard, checkPermission('IAM_MANAGE_SESSIONS'), terminateUserSessions);

// =========================================================================
// 🌟 SUBCONTRACTOR INTELLIGENCE & ANALYTICS
// =========================================================================
const SubcontractorController = require('../controllers/subcontractorController');
router.get('/subcontractors/:id/intelligence', authenticateToken, SubcontractorController.getSubcontractorIntelligence);
router.get('/subcontractors/global/stats', authenticateToken, SubcontractorController.getGlobalStats);
router.get('/subcontractors/global/analytics', authenticateToken, SubcontractorController.getSubcontractorAnalytics);
router.post('/subcontractors/contracts', authenticateToken, SubcontractorController.createContract);
router.post('/subcontractors/claims', authenticateToken, SubcontractorController.submitProgressClaim);
router.post('/subcontractors/bonds', authenticateToken, SubcontractorController.registerBond);
router.post('/subcontractors/retention-release', authenticateToken, SubcontractorController.releaseRetention);
router.post('/subcontractors/:id/performance', authenticateToken, SubcontractorController.updatePerformance);

router.post('/subcontractors/portal/login', SubcontractorController.portalLogin);
router.post('/subcontractors/:id/portal-credentials', authenticateToken, SubcontractorController.updatePortalCredentials);

module.exports = router;