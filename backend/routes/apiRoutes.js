const express = require('express');
const pool = require('../config/db');
const { upload } = require('../config/storage');
const { cleanNumeric, logAudit, logAdvancedAudit, autoLedgerEntry, syncProjectFinancials } = require('../utils/helpers');
const { sendEmailNotification, checkAndSendLowStockEmail } = require('../config/mailer');
const { hasAccess, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/dropdowns', async (req, res) => {
    try {
        // =========================================================================
        // FORCE REBUILD COA AND SCHEMA FIXES (Auto DDL)
        // =========================================================================
        try { 
            // 1. Schema Fixes (Upload error & DDP LCY Currency fields)
            await pool.query("ALTER TABLE attachments ADD COLUMN IF NOT EXISTS table_name VARCHAR(255) DEFAULT 'general'");
            await pool.query("ALTER TABLE attachments ADD COLUMN IF NOT EXISTS record_id INTEGER");
            await pool.query("ALTER TABLE po_ddp_lcy_charges ADD COLUMN IF NOT EXISTS fcy_amount NUMERIC(12,2) DEFAULT 0");
            await pool.query("ALTER TABLE po_ddp_lcy_charges ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(12,2) DEFAULT 1");

            // 2. Chart of Accounts Seeding
            const checkTree = await pool.query("SELECT id FROM chart_of_accounts WHERE account_code = '1000'");
            
            if (checkTree.rows.length === 0) {
                console.log("Seeding New Chart of Accounts...");
                await pool.query("DELETE FROM chart_of_accounts"); 

                const defaultAccounts = [
                    ['1000', 'الأصول (Assets)', 'All', 1, null, 'Asset', 'EGP', false],
                    ['1100', 'الأصول المتداولة', 'All', 2, '1000', 'Asset', 'EGP', false],
                    ['1101', 'صندوق نقدية - تيد كابيتال', 'TED Capital', 3, '1100', 'Asset', 'EGP', true],
                    ['1102', 'صندوق نقدية - ديزاين كونسبت', 'Design Concept', 3, '1100', 'Asset', 'EGP', true],
                    ['1111', 'بنك CIB - تيد كابيتال', 'TED Capital', 3, '1100', 'Asset', 'EGP', true],
                    ['1112', 'بنك الأهلي - ديزاين كونسبت', 'Design Concept', 3, '1100', 'Asset', 'EGP', true],
                    ['1120', 'عملاء (حسابات مدينة - AR)', 'All', 3, '1100', 'Asset', 'EGP', false],
                    ['1130', 'مخزون خامات ومواد', 'All', 3, '1100', 'Asset', 'EGP', false],
                    ['1140', 'دفعات مقدمة للموردين', 'All', 3, '1100', 'Asset', 'EGP', true],
                    ['2000', 'الالتزامات (Liabilities)', 'All', 1, null, 'Liability', 'EGP', false],
                    ['2100', 'الالتزامات المتداولة', 'All', 2, '2000', 'Liability', 'EGP', false],
                    ['2110', 'موردين (حسابات دائنة - AP)', 'All', 3, '2100', 'Liability', 'EGP', false],
                    ['2120', 'مقاولي الباطن', 'All', 3, '2100', 'Liability', 'EGP', false],
                    ['2130', 'دفعات مقدمة من العملاء', 'All', 3, '2100', 'Liability', 'EGP', true],
                    ['2500', 'جاري الشركات الشقيقة', 'All', 2, '2000', 'Liability', 'EGP', true],
                    ['2501', 'جاري شركة ديزاين كونسبت', 'TED Capital', 3, '2500', 'Liability', 'EGP', true],
                    ['2502', 'جاري شركة تيد كابيتال', 'Design Concept', 3, '2500', 'Liability', 'EGP', true],
                    ['3000', 'حقوق الملكية (Equity)', 'All', 1, null, 'Equity', 'EGP', false],
                    ['3100', 'رأس المال', 'All', 2, '3000', 'Equity', 'EGP', true],
                    ['3200', 'جاري الشركاء', 'All', 2, '3000', 'Equity', 'EGP', true],
                    ['3300', 'الأرباح المحتجزة', 'All', 2, '3000', 'Equity', 'EGP', false],
                    ['4000', 'الإيرادات (Revenues)', 'All', 1, null, 'Revenue', 'EGP', false],
                    ['4100', 'إيرادات مبيعات عقارية', 'All', 2, '4000', 'Revenue', 'EGP', true],
                    ['4200', 'إيرادات مستخلصات وخدمات', 'All', 2, '4000', 'Revenue', 'EGP', true],
                    ['4300', 'إيرادات أخرى / غرامات تأخير', 'All', 2, '4000', 'Revenue', 'EGP', true],
                    ['5000', 'التكاليف المباشرة (COGS)', 'All', 1, null, 'Expense', 'EGP', false],
                    ['5100', 'تكلفة خامات ومواد (منصرف)', 'All', 2, '5000', 'Expense', 'EGP', false],
                    ['5200', 'تكلفة مقاولي الباطن', 'All', 2, '5000', 'Expense', 'EGP', false],
                    ['5300', 'أجور وعمالة مباشرة (للموقع)', 'All', 2, '5000', 'Expense', 'EGP', true],
                    ['5400', 'مصاريف استيراد وشحن مباشرة', 'All', 2, '5000', 'Expense', 'EGP', true],
                    ['6000', 'مصاريف عمومية وإدارية', 'All', 1, null, 'Expense', 'EGP', false],
                    ['6100', 'رواتب الإدارة', 'All', 2, '6000', 'Expense', 'EGP', true],
                    ['6200', 'إيجار وتجهيزات المقر', 'All', 2, '6000', 'Expense', 'EGP', true],
                    ['6300', 'تسويق وعمولات بيع', 'All', 2, '6000', 'Expense', 'EGP', true]
                ];
                
                for (let acc of defaultAccounts) {
                    try {
                        await pool.query(
                            "INSERT INTO chart_of_accounts (account_code, account_name, company_entity, hierarchy_level, parent_account, account_type, currency, manual_entry_allowed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                            acc
                        );
                    } catch(insertErr) { console.error("Insert Error for COA:", insertErr.message); }
                }
            }
        } catch(e) { console.error("Schema/COA Seeding Error:", e); }
        // =========================================================================

        const projects = await pool.query("SELECT id, name FROM projects");
        const staff = await pool.query("SELECT name, salary FROM staff");
        const subs = await pool.query("SELECT id, name FROM subcontractors");
        const accs = await pool.query("SELECT account_name FROM chart_of_accounts");
        const custs = await pool.query("SELECT id, name, company_name, phone, legal_id, customer_type, referral, customer_since, product FROM customers");
        const units = await pool.query("SELECT value FROM system_parameters WHERE category='Unit'");
        const paramProjects = await pool.query("SELECT id, value FROM system_parameters WHERE category='Project'");
        
        const projectComps = await pool.query("SELECT DISTINCT company FROM projects WHERE company IS NOT NULL AND company != ''");
        const staffComps = await pool.query("SELECT DISTINCT company FROM staff WHERE company IS NOT NULL AND company != ''");
        const rfqComps = await pool.query("SELECT DISTINCT company FROM rfq WHERE company IS NOT NULL AND company != ''");
        const poComps = await pool.query("SELECT DISTINCT supplier AS company FROM purchase_orders WHERE supplier IS NOT NULL AND supplier != ''");
        
        const allCompanies = [...new Set([
            ...projectComps.rows.map(r=>r.company), 
            ...staffComps.rows.map(r=>r.company), 
            ...rfqComps.rows.map(r=>r.company),
            ...poComps.rows.map(r=>r.company)
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
            subcontractors_dd: subs.rows,
            accounts_dd: accs.rows.map(r => r.account_name),
            customers_dd: custs.rows,
            system_units: units.rows.map(r => r.value),
            companies_dd: allCompanies,
            installments_dd: instsWithStatus
        });
    } catch (err) { 
        console.error("[API ERROR] GET /dropdowns:", err); 
        res.status(500).json({ error: err.message }); 
    }
});

router.get('/users', async (req, res) => {
    try {
        const query = "SELECT id, username, email, role, status, permissions, created_at FROM users ORDER BY id ASC";
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Users Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/table/users', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, email, role, status, permissions, created_at FROM users ORDER BY id ASC");
        res.json({ data: result.rows, total: result.rows.length });
    } catch (err) {
        console.error("Users Table Fetch Error:", err);
        res.status(500).json({ error: err.message, total: 0 });
    }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
    const { username, email, password, role, status, permissions } = req.body;
    try {
        const bcrypt = require('bcryptjs');
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4, status=$5, permissions=$6 WHERE id=$7", [username, email, hash, role, status, JSON.stringify(permissions || {}), req.params.id]);
        } else {
            await pool.query("UPDATE users SET username=$1, email=$2, role=$3, status=$4, permissions=$5 WHERE id=$6", [username, email, role, status, JSON.stringify(permissions || {}), req.params.id]);
        }
        await logAudit(req.user.username, 'UPDATE_USER', 'users', req.params.id, `Updated user ${username}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
        await logAudit(req.user.username, 'DELETE_USER', 'users', req.params.id, `Deleted user ID ${req.params.id}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/system_parameters/:category', requireAdmin, async (req, res) => {
    try {
        const cat = req.params.category.charAt(0).toUpperCase() + req.params.category.slice(1);
        await pool.query("INSERT INTO system_parameters (category, value) VALUES ($1, $2)", [cat, req.body.value]);
        res.json({success: true});
    } catch(err) { 
        console.error("[API ERROR] POST /system_parameters:", err);
        res.status(500).json({error: err.message}); 
    }
});

router.delete('/system_parameters/:category/:val', requireAdmin, async (req, res) => {
    try {
        const cat = req.params.category.charAt(0).toUpperCase() + req.params.category.slice(1);
        await pool.query("DELETE FROM system_parameters WHERE category=$1 AND value=$2", [cat, req.params.val]);
        res.json({success: true});
    } catch(err) { 
        console.error("[API ERROR] DELETE /system_parameters:", err);
        res.status(500).json({error: err.message}); 
    }
});

router.get('/system/backups', requireAdmin, async (req, res) => { 
    try {
        const backups = await pool.query("SELECT * FROM backups_log ORDER BY id DESC");
        res.json({ success: true, data: backups.rows }); 
    } catch(err) { 
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
            if(err) {
                console.error("[BACKUP ERROR] Dump failed:", err);
            } else {
                await pool.query("INSERT INTO backups_log (name, size, source) VALUES ($1, 'Unknown', 'Manual')", [backupFile]);
            }
        });
        res.json({ success: true, message: 'Backup initiated successfully', file: backupFile });
    } catch(err) { 
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
    } catch(e) { 
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
        const { action, user_role, username } = req.body; 

        const invRes = await client.query("SELECT * FROM subcontractor_invoices WHERE id = $1", [invoiceId]);
        if (invRes.rows.length === 0) throw new Error("Invoice not found.");
        const invoice = invRes.rows[0];

        let newStatus = invoice.status;

        if (action === 'TechApprove' && (user_role === 'Engineer' || user_role === 'Admin')) {
            newStatus = 'مراجعة فنية';
        } 
        else if (action === 'FinanceApprove' && (user_role === 'Accountant' || user_role === 'Admin' || user_role === 'CEO')) {
            newStatus = 'اعتماد مالي';
            
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
        else if (action === 'Reject') {
            newStatus = 'مرفوض';
        } else {
            throw new Error("Unauthorized action or invalid workflow step.");
        }

        await client.query("UPDATE subcontractor_invoices SET status = $1 WHERE id = $2", [newStatus, invoiceId]);
        await logAdvancedAudit(client, username, 'subcontractor_invoices', invoiceId, 'Approval Workflow', `Status changed from ${invoice.status} to ${newStatus}`);

        await client.query('COMMIT');
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
    } catch(err) { 
        res.status(500).json({error: err.message}); 
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
        if(clientRes.rows.length === 0) return res.status(404).json({ error: "Client not found" });
        
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
    } catch(err) { 
        res.status(500).json({ error: err.message }); 
    }
});

router.delete('/delete_attachment/:id', async (req, res) => {
    try { 
        await pool.query("DELETE FROM attachments WHERE id=$1", [req.params.id]); 
        res.json({ success: true }); 
    } catch(err) { 
        res.status(500).json({ error: err.message }); 
    }
});

router.post('/upload/:table/:id', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded." });
        
        const filePath = req.file.location || `/uploads/${req.file.filename}`;
        await pool.query("INSERT INTO attachments (table_name, record_id, file_name, file_path, uploaded_by) VALUES ($1, $2, $3, $4, $5)", [req.params.table, req.params.id, req.file.originalname, filePath, req.user.username]);
        res.json({ success: true, url: filePath });
    } catch(err) { 
        console.error("[API ERROR] POST /upload:", err);
        res.status(500).json({ error: err.message }); 
    }
});

router.get('/table/:type', async (req, res) => {
    try {
        const { type } = req.params;
        let accessType = type;
        if(type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') accessType = 'purchase_orders';
        if(type === 'client_consumptions' || type === 'client_refunds') accessType = 'customers'; 
        if(type === 'gl_mappings') accessType = 'ledger';

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
        } else if (type === 'inventory') {
            prefix = "i.";
            queryStr = `SELECT i.*, po.specification, po.uom, po.fx_rate, po.qty as po_original_qty, po.estimated_cost as po_unit_cost_fcy, COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id = po.id), 0) AS po_ddp_added, COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id = po.id), 0) AS po_ddp_lcy_added FROM inventory i LEFT JOIN purchase_orders po ON i.po_id = po.id`;
            countStr = `SELECT COUNT(*) FROM inventory i LEFT JOIN purchase_orders po ON i.po_id = po.id`;
        } else if (type === 'inventory_sales') {
            prefix = "ins.";
            queryStr = `SELECT ins.*, i.po_id, po.specification, po.qty as po_original_qty, po.estimated_cost as po_unit_cost_fcy, po.fx_rate, COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id = po.id), 0) AS po_ddp_added, COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id = po.id), 0) AS po_ddp_lcy_added FROM inventory_sales ins LEFT JOIN inventory i ON ins.inventory_id = i.id LEFT JOIN purchase_orders po ON i.po_id = po.id`;
            countStr = `SELECT COUNT(*) FROM inventory_sales ins LEFT JOIN inventory i ON ins.inventory_id = i.id LEFT JOIN purchase_orders po ON i.po_id = po.id`;
        } else if (type === 'client_consumptions') {
            prefix = "cc.";
            queryStr = `
            SELECT 
                cc.*,
                c.name AS client_name,
                COALESCE(i.name, CASE WHEN cc.paid_amount > 0 AND cc.total_revenue = 0 THEN '🟢 رصيد دائن للعميل' ELSE 'تسوية رصيد' END) AS inventory_name
            FROM client_consumptions cc 
            LEFT JOIN customers c ON cc.client_id = c.id 
            LEFT JOIN inventory i ON cc.inventory_id = i.id`;
            countStr = `SELECT COUNT(*) FROM client_consumptions cc LEFT JOIN customers c ON cc.client_id = c.id LEFT JOIN inventory i ON cc.inventory_id = i.id`;
        } else if (type === 'customers') {
            prefix = "c.";
            queryStr = `SELECT * FROM customers c`;
            countStr = `SELECT COUNT(*) FROM customers c`;
        } else if (type === 'client_refunds') {
            prefix = "cr.";
            queryStr = `SELECT * FROM client_refunds cr`;
            countStr = `SELECT COUNT(*) FROM client_refunds cr`;
        }

        let conditions = []; let params = [];

        if (filter) {
            if (['contracts', 'installments', 'payment_receipts'].includes(type)) { conditions.push(`pu.project_name = $${params.length + 1}`); params.push(filter); } 
            else if (['projects', 'partners', 'boq', 'tasks', 'daily_reports', 'rfq', 'purchase_orders', 'subcontractors', 'inventory', 'material_usage', 'ar_invoices', 'inventory_sales'].includes(type)) { conditions.push(`${prefix}project_name = $${params.length + 1}`); params.push(filter); } 
            else if (type === 'inventory_transfers') { conditions.push(`(${prefix}from_project = $${params.length + 1} OR ${prefix}to_project = $${params.length + 1})`); params.push(filter); } 
            else if (type === 'returns') { conditions.push(`(${prefix}project_name = $${params.length + 1} OR ${prefix}return_to = $${params.length + 1})`); params.push(filter); }
            else if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') { conditions.push(`po_id = $${params.length + 1}`); params.push(filter); }
            else if (type === 'client_consumptions') { conditions.push(`cc.client_id = $${params.length + 1}`); params.push(filter); }
            else if (type === 'client_refunds') { conditions.push(`cr.client_id = $${params.length + 1}`); params.push(filter); }
        }

        if (search) {
            const searchIdx = params.length + 1;
            if (type === 'installments') { conditions.push(`(cu.name ILIKE $${searchIdx} OR i.installment_no ILIKE $${searchIdx} OR i.unit_number ILIKE $${searchIdx} OR CAST(i.contract_id AS TEXT) ILIKE $${searchIdx} OR pu.project_name ILIKE $${searchIdx})`); }
            else if (type === 'contracts') { conditions.push(`(cu.name ILIKE $${searchIdx} OR pu.unit_number ILIKE $${searchIdx} OR c.contract_type ILIKE $${searchIdx} OR CAST(c.id AS TEXT) ILIKE $${searchIdx})`); }
            else if (type === 'payment_receipts') { conditions.push(`(cu.name ILIKE $${searchIdx} OR pr.reference_no ILIKE $${searchIdx} OR i.installment_no ILIKE $${searchIdx})`); }
            else if (type === 'inventory_sales') { conditions.push(`(ins.item_name ILIKE $${searchIdx} OR ins.customer_name ILIKE $${searchIdx} OR ins.project_name ILIKE $${searchIdx} OR CAST(ins.po_id AS TEXT) ILIKE $${searchIdx})`); }
            else if (type === 'partners') { conditions.push(`(p.name ILIKE $${searchIdx} OR p.project_name ILIKE $${searchIdx})`); } 
            else if (type === 'subcontractors') { conditions.push(`(s.name ILIKE $${searchIdx} OR s.project_name ILIKE $${searchIdx})`); } 
            else if (type === 'chart_of_accounts') { conditions.push(`(account_name ILIKE $${searchIdx} OR account_code ILIKE $${searchIdx})`); } 
            else if (type === 'client_consumptions') { conditions.push(`(c.name ILIKE $${searchIdx} OR i.name ILIKE $${searchIdx})`); }
            else if (type === 'customers') { conditions.push(`(c.name ILIKE $${searchIdx} OR c.company_name ILIKE $${searchIdx} OR c.legal_id ILIKE $${searchIdx})`); }
            else { conditions.push(`(CAST(${prefix}id AS TEXT) ILIKE $${searchIdx})`); }
            params.push(`%${search}%`);
        }

        if (conditions.length > 0) { 
            const whereClause = " WHERE " + conditions.join(" AND "); 
            queryStr += whereClause; 
            countStr += whereClause; 
        }

        if (type === 'client_consumptions') {
            queryStr += ` ORDER BY cc.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
// ACID TRANSACTIONS FOR ALL DYNAMIC ADDS (Includes Journal Entries Linkage)
// =========================================================================
router.post('/add/:type', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { type } = req.params;
        let pNameForSync = null;
        let skipInsert = false;
        let newId = null;
        
        let accessType = type;
        if (type === 'po_ddp_charges' || type === 'po_ddp_lcy_charges') accessType = 'purchase_orders';
        if (type === 'gl_mappings') accessType = 'ledger';

        if (!hasAccess(req.user, accessType, 'create')) {
            throw new Error("Access Denied.");
        }

        let data = req.body;
        pNameForSync = data.project_name || (type === 'projects' ? data.name : null);

        const calcFields = ['dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'expected_profit_amount', 'actual_profit_amount', 'partners_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'actual_profit', 'waivePenalty'];
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
            if (data.transfer_from) { data.from_project = data.transfer_from; delete data.transfer_from; }
            if (data.transfer_to) { data.to_project = data.transfer_to; delete data.transfer_to; }
        }
        if (type === 'inventory') {
            if (!data.remaining_qty) data.remaining_qty = data.qty;
        }
        
        if (type === 'inventory_sales' || type === 'material_usage') {
            const qtyField = type === 'material_usage' ? data.qty : data.qty;
            const invIdField = type === 'material_usage' ? "name" : "id";
            const invVal = type === 'material_usage' ? data.material : data.inventory_id;
            
            const invCheck = await client.query(`SELECT remaining_qty FROM inventory WHERE ${invIdField} = $1`, [invVal]);
            if(invCheck.rows.length > 0) {
                if (parseFloat(qtyField) > parseFloat(invCheck.rows[0]?.remaining_qty || 0)) {
                    throw new Error("Insufficient available stock (Available stock cannot be less than 0).");
                }
            }
        }

        if (type === 'material_usage') {
            const invCheck = await client.query("SELECT buy_price FROM inventory WHERE name = $1 LIMIT 1", [data.material]);
            data.est_cost = (parseFloat(data.qty) * (invCheck.rows.length > 0 ? parseFloat(invCheck.rows[0]?.buy_price || 0) : 0)).toFixed(2);
        }
        
        if (type === 'inventory_sales') {
            const invCheck = await client.query(`
                SELECT i.name, i.buy_price, i.po_id, po.estimated_cost as po_unit_cost_fcy, po.qty as po_qty, po.fx_rate,
                COALESCE((SELECT SUM(amount) FROM po_ddp_charges WHERE po_id = i.po_id), 0) AS ddp_fcy,
                COALESCE((SELECT SUM(amount) FROM po_ddp_lcy_charges WHERE po_id = i.po_id), 0) AS ddp_lcy
                FROM inventory i
                LEFT JOIN purchase_orders po ON i.po_id = po.id
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
                data.item_name = item.name || 'Unknown';
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
            if(instRes.rows.length > 0) {
                const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1", [data.installment_id]);
                const paidSoFar = parseFloat(paidSoFarRes.rows[0]?.total || 0);
                const newlyPaid = parseFloat(data.amount) || 0;
                
                if ((paidSoFar + newlyPaid) > instAmt) {
                    throw new Error("Collected Amount Cannot Exceed Installment Total Amount.");
                }
                
                data.outstanding_amount = instAmt - (paidSoFar + newlyPaid);
                if(data.outstanding_amount < 0) data.outstanding_amount = 0;
            }
        }

        if (type === 'inventory_sales' && !skipInsert) {
             const custRes = await client.query("SELECT id, credit_limit FROM customers WHERE name = $1", [data.customer_name]);
             if (custRes.rows.length > 0) {
                 const clientRow = custRes.rows[0];
                 const limit = parseFloat(clientRow.credit_limit || 0);
                 
                 const debtRes = await client.query("SELECT SUM(outstanding_balance) as total_debt FROM client_consumptions WHERE client_id = $1", [clientRow.id]);
                 const currentDebt = parseFloat(debtRes.rows[0]?.total_debt || 0);
                 const newSaleValue = parseFloat(data.qty || 0) * parseFloat(data.sell_price || 0);
                 
                 if (limit > 0 && (currentDebt + newSaleValue) > limit) {
                     throw new Error(`تم إيقاف العملية! تم تجاوز الحد الائتماني للعميل. الحد المسموح: ${limit} | الديون الحالية: ${currentDebt} | قيمة العملية: ${newSaleValue}`);
                 }
             }
        }

        if (!skipInsert) {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            if(keys.length > 0) {
                 const result = await client.query(`INSERT INTO ${type} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`, values);
                 newId = result.rows[0].id;
            }
        }
        
        if(newId) await logAudit(req.user.username, skipInsert ? 'UPDATE' : 'CREATE', type, newId, skipInsert ? `Aggregated record in ${type}` : `Added record to ${type}`);

        if (type === 'payment_receipts' && data.installment_id && !skipInsert) {
            const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [data.installment_id]);
            if(instRes.rows.length > 0) {
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
            await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) - $1 WHERE name = $2", [data.qty, data.material]);
            const invIdRes = await client.query("SELECT id FROM inventory WHERE name = $1", [data.material]);
            if (invIdRes.rows.length > 0) await checkAndSendLowStockEmail(invIdRes.rows[0].id);
        }
        
        if (type === 'inventory_sales' && !skipInsert) {
            await client.query("UPDATE inventory SET remaining_qty = remaining_qty - $1 WHERE id = $2", [data.qty, data.inventory_id]);
            await checkAndSendLowStockEmail(data.inventory_id);
            try {
                const custRes = await client.query("SELECT id FROM customers WHERE name = $1", [data.customer_name]);
                if (custRes.rows.length > 0) {
                    const clientId = custRes.rows[0].id;
                    const totalRev = parseFloat(data.sell_price || 0) * parseFloat(data.qty || 0);
                    
                    const duplicateCheck = await client.query(
                        "SELECT id FROM client_consumptions WHERE client_id = $1 AND inventory_id = $2 AND consumed_qty = $3 AND total_revenue = $4 AND outstanding_date = $5 LIMIT 1",
                        [clientId, data.inventory_id || null, data.qty, totalRev, data.date]
                    );
                    
                    if (duplicateCheck.rows.length === 0) {
                        await client.query(
                            "INSERT INTO client_consumptions (client_id, inventory_id, consumed_qty, paid_amount, outstanding_balance, outstanding_date, created_by, total_revenue) VALUES ($1, $2, $3, 0, $4, $5, $6, $7)", 
                            [clientId, data.inventory_id || null, data.qty, totalRev, data.date, req.user.username, totalRev]
                        );
                        
                        if (totalRev > 0) {
                            await client.query(
                                "INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, 0)", 
                                [clientId, totalRev, totalRev, data.date, data.inventory_id || null, data.qty]
                            );
                        }
                    }
                }
            } catch(e) {
                console.error("[API ERROR] Auto-insert client_consumptions failed:", e);
            }
        }

        if (type === 'client_consumptions' && !skipInsert) {
            if (parseFloat(data.consumed_qty) > 0) {
                const invCheck = await client.query("SELECT remaining_qty FROM inventory WHERE id = $1", [data.inventory_id]);
                if(invCheck.rows.length > 0 && parseFloat(invCheck.rows[0]?.remaining_qty || 0) >= parseFloat(data.consumed_qty)) {
                    await client.query("UPDATE inventory SET remaining_qty = remaining_qty - $1 WHERE id = $2", [data.consumed_qty, data.inventory_id]);
                }
            }
            
            if (parseFloat(data.outstanding_balance) > 0) {
                await client.query(
                    "INSERT INTO client_delayed_payments (client_id, amount, original_amount, due_date, inventory_id, consumed_qty, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, 0)", 
                    [data.client_id, data.outstanding_balance, data.outstanding_balance, data.outstanding_date, data.inventory_id || null, data.consumed_qty]
                );
            }
        }        

        if (type === 'returns') await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) + $1 WHERE name = $2", [data.qty, data.material]);
        
        if (type === 'inventory_transfers') {
            await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) - $1 WHERE name = $2 AND (project_name = $3 OR project_name IS NULL)", [data.qty, data.material, data.from_project]);
            await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) + $1 WHERE name = $2 AND (project_name = $3 OR project_name IS NULL)", [data.qty, data.material, data.to_project]);
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

        if (type === 'ledger') await autoLedgerEntry(client, data.account_name, data.cost_center, cleanNumeric(data.debit), cleanNumeric(data.credit), data.description, req.user.username);
        
        if (pNameForSync) await syncProjectFinancials(pNameForSync, client);

        await client.query('COMMIT');
        res.json({ success: true, id: newId });
    } catch (err) { 
        await client.query('ROLLBACK');
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

        const calcFields = ['dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'expected_profit_amount', 'actual_profit_amount', 'partners_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'actual_profit', 'waivePenalty'];
        
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
                if(instRes.rows.length > 0) {
                    const instAmt = parseFloat(instRes.rows[0]?.amount || 0);
                    const paidSoFarRes = await client.query("SELECT SUM(amount) as total FROM payment_receipts WHERE installment_id = $1 AND id != $2", [instId, id]);
                    const paidOther = parseFloat(paidSoFarRes.rows[0]?.total || 0);
                    const newlyPaid = parseFloat(data.amount) || 0;
                    
                    if ((paidOther + newlyPaid) > instAmt) {
                        throw new Error("Collected Amount Cannot Exceed Installment Total Amount.");
                    }
                    
                    data.outstanding_amount = instAmt - (paidOther + newlyPaid);
                    if(data.outstanding_amount < 0) data.outstanding_amount = 0;
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

        const keys = Object.keys(data);
        if(keys.length > 0) {
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const values = Object.values(data);
            await client.query(`UPDATE ${type} SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
        }
        
        await logAudit(req.user.username, 'UPDATE', type, id, `Updated record in ${type}`);

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
        
        if (type === 'material_usage') {
            const old = await client.query("SELECT material, qty FROM material_usage WHERE id = $1", [id]);
            if(old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) + $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
        }
        
        if (type === 'inventory_sales') {
            const old = await client.query("SELECT * FROM inventory_sales WHERE id = $1", [id]);
            if(old.rows.length > 0) {
                const sale = old.rows[0];
                await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [sale.qty, sale.inventory_id]);
                
                const custRes = await client.query("SELECT id FROM customers WHERE TRIM(LOWER(name)) = TRIM(LOWER($1))", [sale.customer_name]);
                if(custRes.rows.length > 0) {
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
            if(old.rows.length > 0 && parseFloat(old.rows[0]?.consumed_qty || 0) > 0) await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [old.rows[0].consumed_qty, old.rows[0].inventory_id]);
        }
        if (type === 'returns') {
            const old = await client.query("SELECT material, qty FROM returns WHERE id = $1", [id]);
            if(old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) - $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
        }

        if (type === 'payment_receipts') {
            const oldRec = await client.query("SELECT amount, installment_id FROM payment_receipts WHERE id = $1", [id]);
            if (oldRec.rows.length > 0) {
                const installment_id = oldRec.rows[0]?.installment_id;
                await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]); 
                
                const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [installment_id]);
                if(instRes.rows.length > 0) {
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

        await logAudit(req.user.username, 'DELETE', type, id, 'Record Deleted'); 
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
                if(old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) + $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
            }
            if (type === 'inventory_sales') {
                const saleRes = await client.query("SELECT * FROM inventory_sales WHERE id = $1", [id]);
                if(saleRes.rows.length > 0) {
                    const sale = saleRes.rows[0];
                    const totalRev = parseFloat(sale.sell_price || 0) * parseFloat(sale.qty || 0);

                    await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [sale.qty, sale.inventory_id]);

                    const custRes = await client.query("SELECT id FROM customers WHERE TRIM(LOWER(name)) = TRIM(LOWER($1))", [sale.customer_name]);
                    if(custRes.rows.length > 0) {
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
                if(old.rows.length > 0 && parseFloat(old.rows[0]?.consumed_qty || 0) > 0) await client.query("UPDATE inventory SET remaining_qty = remaining_qty + $1 WHERE id = $2", [old.rows[0].consumed_qty, old.rows[0].inventory_id]);
            }
            if (type === 'returns') {
                const old = await client.query("SELECT material, qty FROM returns WHERE id = $1", [id]);
                if(old.rows.length > 0) await client.query("UPDATE inventory SET remaining_qty = COALESCE(remaining_qty, qty) - $1 WHERE name = $2", [old.rows[0].qty, old.rows[0].material]);
            }

            if (type === 'payment_receipts') {
                const oldRec = await client.query("SELECT amount, installment_id FROM payment_receipts WHERE id = $1", [id]);
                if (oldRec.rows.length > 0) {
                    const installment_id = oldRec.rows[0]?.installment_id;
                    await client.query(`DELETE FROM ${type} WHERE id = $1`, [id]); 
                    
                    const instRes = await client.query("SELECT amount FROM installments WHERE id = $1", [installment_id]);
                    if(instRes.rows.length > 0) {
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

router.post('/action/receive_po/:id', async (req, res) => {
    try {
        if (!hasAccess(req.user, 'inventory', 'create')) return res.status(403).json({ error: "Access Denied." });
        const poRes = await pool.query("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        if (poRes.rows.length === 0) return res.status(404).json({ error: "PO not found." });
        const po = poRes.rows[0];
        if (po.status !== 'Approved') return res.status(400).json({ error: "PO must be approved first." });

        const ddpFcyRes = await pool.query("SELECT SUM(amount) as sum FROM po_ddp_charges WHERE po_id = $1", [po.id]);
        const ddpLcyRes = await pool.query("SELECT SUM(amount) as sum FROM po_ddp_lcy_charges WHERE po_id = $1", [po.id]);
        const ddpFcy = parseFloat(ddpFcyRes.rows[0]?.sum || 0);
        const ddpLcy = parseFloat(ddpLcyRes.rows[0]?.sum || 0);
        
        const q = parseFloat(po.qty) || 1;
        const ucFcy = parseFloat(po.estimated_cost) || 0;
        const fx = parseFloat(po.fx_rate) || 1;
        
        const exWork = q * ucFcy;
        const totalDdpFcy = exWork + ddpFcy;
        const totalDdpLcy = (totalDdpFcy * fx) + ddpLcy;
        const unitCostLcy = q > 0 ? (totalDdpLcy / q) : 0;
        
        const itemName = po.item_description ? po.item_description : `Item from PO-${po.id}`;

        await pool.query(
            "INSERT INTO inventory (po_id, name, project_name, qty, remaining_qty, buy_price, buy_date) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)",
            [po.id, itemName, po.project_name, po.qty || 0, po.qty || 0, unitCostLcy]
        );
        await pool.query("UPDATE purchase_orders SET status = 'Received' WHERE id = $1", [req.params.id]);
        await logAudit(req.user.username, 'RECEIVE_PO', 'purchase_orders', req.params.id, `Received PO #${req.params.id} into Inventory`);
        res.json({ success: true });
    } catch (err) { 
        console.error("[API ERROR] POST /action/receive_po:", err);
        res.status(500).json({ error: err.message }); 
    }
});

router.post('/action/rereceive_po/:id', async (req, res) => {
    try {
        if (!hasAccess(req.user, 'inventory', 'create')) return res.status(403).json({ error: "Access Denied." });
        const poRes = await pool.query("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        if (poRes.rows.length === 0) return res.status(404).json({ error: "PO not found." });
        const po = poRes.rows[0];
        
        const checkExist = await pool.query("SELECT id FROM inventory WHERE po_id = $1", [req.params.id]);
        if (checkExist.rows.length > 0) {
            return res.status(400).json({ error: "هذه البيانات موجودة بالفعل في جدول المخزون ولا يمكن إعادة استلامها مرة أخرى." });
        }
        
        const ddpFcyRes = await pool.query("SELECT SUM(amount) as sum FROM po_ddp_charges WHERE po_id = $1", [po.id]);
        const ddpLcyRes = await pool.query("SELECT SUM(amount) as sum FROM po_ddp_lcy_charges WHERE po_id = $1", [po.id]);
        const ddpFcy = parseFloat(ddpFcyRes.rows[0]?.sum || 0);
        const ddpLcy = parseFloat(ddpLcyRes.rows[0]?.sum || 0);
        
        const q = parseFloat(po.qty) || 1;
        const ucFcy = parseFloat(po.estimated_cost) || 0;
        const fx = parseFloat(po.fx_rate) || 1;
        
        const exWork = q * ucFcy;
        const totalDdpFcy = exWork + ddpFcy;
        const totalDdpLcy = (totalDdpFcy * fx) + ddpLcy;
        const unitCostLcy = q > 0 ? (totalDdpLcy / q) : 0;

        const itemName = po.item_description ? po.item_description : `Item from PO-${po.id}`;

        await pool.query(
            "INSERT INTO inventory (po_id, name, project_name, qty, remaining_qty, buy_price, buy_date) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)",
            [po.id, itemName, po.project_name, po.qty || 0, po.qty || 0, unitCostLcy]
        );
        await pool.query("UPDATE purchase_orders SET status = 'Re-received' WHERE id = $1", [req.params.id]);
        await logAudit(req.user.username, 'RE-RECEIVE_PO', 'purchase_orders', req.params.id, `Re-received PO #${req.params.id} into Inventory`);
        res.json({ success: true });
    } catch (err) { 
        console.error("[API ERROR] POST /action/rereceive_po:", err);
        res.status(500).json({ error: err.message }); 
    }
});

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

router.post('/staff/payroll', async (req, res) => {
    const { staffId, month, year, projects } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (!hasAccess(req.user, 'payroll', 'create')) throw new Error("Access Denied.");
        
        const staffRes = await client.query("SELECT * FROM staff WHERE id = $1", [staffId]);
        if (staffRes.rows.length === 0) throw new Error("الموظف غير موجود.");
        
        const staff = staffRes.rows[0];
        const salary = parseFloat(staff.salary || 0);
        
        const totalPercent = projects.reduce((sum, p) => sum + parseFloat(p.percent || 0), 0);
        if (totalPercent > 100) throw new Error("مجموع نسب التوزيع يتجاوز 100%");

        for (const p of projects) {
            const projectSalary = salary * (parseFloat(p.percent) / 100);
            if (projectSalary > 0) {
                await client.query(
                    "INSERT INTO payroll (staff_id, project_name, amount, period) VALUES ($1, $2, $3, $4)",
                    [staffId, p.project_name, projectSalary, `${month}-${year}`]
                );
                
                await autoLedgerEntry(client, 'رواتب الإدارة', p.project_name, projectSalary, 0, `راتب الموظف ${staff.name} - حصة المشروع`, req.user.username);
                await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', p.project_name, 0, projectSalary, `صرف راتب الموظف ${staff.name}`, req.user.username);
            }
        }
        
        await logAdvancedAudit(client, req.user.username, 'payroll', staffId, 'GENERATE', `Distributed payroll across projects for ${month}-${year}`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم توزيع وصرف الراتب والقيود الآلية بنجاح." });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] Error distributing payroll:", e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/pay-delayed-balance', async (req, res) => {
    const { client_id, amount_paid } = req.body;
    let remainingPayment = parseFloat(amount_paid || 0);

    if (!client_id || !remainingPayment || remainingPayment <= 0) return res.status(400).json({ error: "المبلغ المدفوع غير صحيح." });

    const client = await pool.connect();
    try {
        await client.query("BEGIN"); 

        const pendingDebts = await client.query(
            "SELECT * FROM client_delayed_payments WHERE client_id = $1 AND status != 'Paid' AND amount > 0 ORDER BY due_date ASC", [client_id]
        );

        for (let debt of pendingDebts.rows) {
            if (remainingPayment <= 0) break;
            if (!debt) continue;

            let debtAmount = parseFloat(debt.amount || 0);
            let paidForThisDebt = 0;
            let newStatus = 'Pending';

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
            const newHistory = { payment_date: new Date().toISOString(), amount_paid: paidForThisDebt };

            await client.query(`
                UPDATE client_delayed_payments 
                SET amount = $1, paid_amount = $2, status = $3, last_payment_date = CURRENT_DATE,
                    payment_history = COALESCE(payment_history, '[]'::jsonb) || $4::jsonb
                WHERE id = $5
            `, [newAmount, newPaidTotal, newStatus, JSON.stringify(newHistory), debt.id]);

            await client.query("INSERT INTO client_payment_history (client_id, delayed_payment_id, amount_paid, payment_date) VALUES ($1, $2, $3, CURRENT_DATE)", [client_id, debt.id, paidForThisDebt]);

            if (paidForThisDebt > 0) {
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

                await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', 'General', paidForThisDebt, 0, `سداد مديونية متأخرة - عميل رقم ${client_id}`, req.user ? req.user.username : 'System');
                await autoLedgerEntry(client, 'العملاء', 'General', 0, paidForThisDebt, `سداد مديونية متأخرة - عميل رقم ${client_id}`, req.user ? req.user.username : 'System');
            }
        }
        
        await client.query("COMMIT");
        res.json({ success: true, message: "تم السداد بنجاح وإضافة القيود المحاسبية." });
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

router.post('/staff/payroll', async (req, res) => {
    const { staffId, month, year, projects } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (!hasAccess(req.user, 'payroll', 'create')) throw new Error("Access Denied.");
        
        const staffRes = await client.query("SELECT * FROM staff WHERE id = $1", [staffId]);
        if (staffRes.rows.length === 0) throw new Error("الموظف غير موجود.");
        
        const staff = staffRes.rows[0];
        const salary = parseFloat(staff.salary || 0);
        
        const totalPercent = projects.reduce((sum, p) => sum + parseFloat(p.percent || 0), 0);
        if (totalPercent > 100) throw new Error("مجموع نسب التوزيع يتجاوز 100%");

        for (const p of projects) {
            const projectSalary = salary * (parseFloat(p.percent) / 100);
            if (projectSalary > 0) {
                await client.query(
                    "INSERT INTO payroll (staff_id, project_name, amount, period) VALUES ($1, $2, $3, $4)",
                    [staffId, p.project_name, projectSalary, `${month}-${year}`]
                );
                
                // القيود المحاسبية لصرف الرواتب محمّلة على مركز تكلفة المشروع
                await autoLedgerEntry(client, 'رواتب الإدارة', p.project_name, projectSalary, 0, `راتب الموظف ${staff.name} - حصة المشروع`, req.user.username);
                await autoLedgerEntry(client, 'صندوق نقدية - تيد كابيتال', p.project_name, 0, projectSalary, `صرف راتب الموظف ${staff.name}`, req.user.username);
            }
        }
        
        await logAudit(req.user.username, 'GENERATE', 'payroll', staffId, `Distributed payroll across projects for ${month}-${year}`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم توزيع وصرف الراتب وتوليد القيود المحاسبية بنجاح." });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[API ERROR] Error distributing payroll:", e);
        res.status(500).json({ error: e.message });
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
                i.name as item_name
            FROM client_payment_history cph
            LEFT JOIN client_delayed_payments cdp ON cph.delayed_payment_id = cdp.id
            LEFT JOIN inventory i ON cdp.inventory_id = i.id
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

        const invRes = await client.query('SELECT id FROM inventory WHERE po_id = $1 LIMIT 1', [preOrder.po_id]);
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

        await client.query("UPDATE inventory SET remaining_qty = remaining_qty - $1 WHERE id = $2", [preOrder.reserved_qty, inventoryId]);

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
        } catch(emailErr) { console.error("Preorder Email Error:", emailErr); }

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
module.exports = router;