const pool = require('../config/db');
const backupService = require('../services/backupService');
const maintenanceService = require('../services/maintenanceService');

class SystemController {
    async getDropdowns(req, res) {
        try {
            const projects = await pool.query("SELECT id, name FROM projects WHERE is_deleted = false");
            const staff = await pool.query("SELECT name, salary FROM staff WHERE is_deleted = false");
            const subs = await pool.query("SELECT id, name FROM subcontractors WHERE is_deleted = false");
            const accs = await pool.query("SELECT id, account_code, account_name FROM chart_of_accounts ORDER BY account_code ASC");
            const custs = await pool.query("SELECT id, name, company_name FROM customers WHERE is_deleted = false");
            const units = await pool.query("SELECT value FROM system_parameters WHERE category='Unit'");
            
            res.json({
                projects_dd: projects.rows, 
                staff_dd: staff.rows,
                subcontractors_dd: subs.rows,
                accounts_dd: accs.rows.map(r => r.account_name),
                accounts_full_dd: accs.rows, // New: includes codes and IDs
                customers_dd: custs.rows,
                system_units: units.rows.map(r => r.value)
            });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getFinancialAccounts(req, res) {
        try {
            // Fetch accounts starting with 110 (Cash) or 111 (Bank) - standardized ERP COA
            const query = `
                SELECT id, account_code, account_name 
                FROM chart_of_accounts 
                WHERE account_code LIKE '110%' OR account_code LIKE '111%'
                ORDER BY account_code ASC
            `;
            const result = await pool.query(query);
            res.json({ success: true, data: result.rows });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getBackups(req, res) {
        try {
            // Auto-recover registry if empty
            const existing = await backupService.getBackups();
            if (existing.length === 0) {
                await maintenanceService.recoverBackupRegistry();
            }
            const backups = await backupService.getBackups();
            res.json({ success: true, data: backups });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async manualBackup(req, res) {
        try {
            const result = await backupService.createBackup('MANUAL');
            res.json({ success: true, message: 'Backup created successfully', ...result });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async restoreBackup(req, res) {
        const { backup_id, confirmation_key } = req.body;
        if (confirmation_key !== 'RESTORE_CONFIRMED') return res.status(403).json({ error: "Invalid key." });
        try {
            const result = await backupService.restoreBackup(backup_id);
            res.json(result);
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getPurgeableTables(req, res) {
        try {
            const tables = await maintenanceService.getPurgeableTables();
            res.json({ success: true, data: tables });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async factoryReset(req, res) {
        const { confirmation_key, tables } = req.body;
        if (confirmation_key !== 'FACTORY_RESET_ALL') return res.status(403).json({ error: "Invalid key." });
        try {
            const result = await maintenanceService.secureReset('MAIN_TENANT', req.user.username, tables);
            // Re-sync backup list after purge so the user can still restore
            await maintenanceService.recoverBackupRegistry();
            res.json(result);
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async recoverBackups(req, res) {
        try {
            const result = await maintenanceService.recoverBackupRegistry();
            res.json(result);
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getNotifications(req, res) {
        try {
            const result = await pool.query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [req.user.id]);
            res.json({ success: true, data: result.rows });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async markNotificationRead(req, res) {
        try {
            await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getPendingAuthorizations(req, res) {
        try {
            const query = `
                SELECT wi.*, wd.module_name, wd.min_amount 
                FROM workflow_instances wi
                JOIN workflow_definitions wd ON wi.definition_id = wd.id
                WHERE wi.status = 'Pending Authorization'
                ORDER BY wi.created_at DESC
            `;
            const result = await pool.query(query);
            res.json({ success: true, data: result.rows });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async authorizeRecord(req, res) {
        const { instance_id, action, comments } = req.body;
        const { processApprovalWorkflow } = require('../services/workflowEngine');
        try {
            const instRes = await pool.query("SELECT * FROM workflow_instances WHERE id = $1", [instance_id]);
            if (instRes.rows.length === 0) throw new Error("طلب الاعتماد غير موجود.");
            const inst = instRes.rows[0];

            const defRes = await pool.query("SELECT module_name FROM workflow_definitions WHERE id = $1", [inst.definition_id]);
            const moduleName = defRes.rows[0].module_name;

            // Get amount from original record
            const recordRes = await pool.query(`SELECT * FROM ${moduleName} WHERE id = $1`, [inst.record_id]);
            const record = recordRes.rows[0];
            const amount = parseFloat(record.amount || record.total_amount || record.budget || 0);

            const workflowResult = await processApprovalWorkflow(moduleName, inst.record_id, action, req.user.username, req.user.role, amount);

            if (workflowResult.isFinalApproval) {
                await pool.query(`UPDATE ${moduleName} SET status = $1, authorized_by = $2, authorization_date = CURRENT_TIMESTAMP WHERE id = $3`, [workflowResult.newStatus, req.user.username, inst.record_id]);
            }

            res.json({ success: true, newStatus: workflowResult.newStatus });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getWorkflowDefinitions(req, res) {
        try {
            const result = await pool.query("SELECT * FROM workflow_definitions ORDER BY module_name ASC");
            res.json({ success: true, data: result.rows });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async updateWorkflowDefinition(req, res) {
        const { id } = req.params;
        const { min_amount, is_active, auto_approve_below } = req.body;
        try {
            await pool.query(
                "UPDATE workflow_definitions SET min_amount = $1, is_active = $2, auto_approve_below = $3 WHERE id = $4",
                [min_amount, is_active, auto_approve_below, id]
            );
            res.json({ success: true, message: "تم تحديث إعدادات المسار بنجاح" });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async getRecordAuditLogs(req, res) {
        const { table_name, record_id } = req.query;
        try {
            const query = `
                SELECT id, action, old_data, new_data, username, created_at 
                FROM audit_logs 
                WHERE table_name = $1 AND record_id = $2 
                ORDER BY created_at DESC
            `;
            const result = await pool.query(query, [table_name, record_id]);
            res.json({ success: true, data: result.rows });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }

    async runIntelligenceDiagnostics(req, res) {
        const intelligenceEngine = require('../services/intelligenceEngine');
        try {
            // Background the diagnostic cycle to prevent timeout for the requester
            intelligenceEngine.runDiagnostics();
            res.json({ success: true, message: 'Intelligence diagnostic cycle started in background.' });
        } catch (err) { 
            console.error("Manual Intelligence Trigger Error:", err);
            res.status(500).json({ error: err.message }); 
        }
    }

    async getSidebarStats(req, res) {
        try {
            const stats = {
                approvals: 0,
                inventory: 0,
                command: 0,
                finance: 0
            };

            // 1. Pending Approvals (Defensive)
            try {
                const res = await pool.query("SELECT COUNT(*) FROM workflow_instances WHERE status = 'Pending Authorization' AND (is_deleted IS NULL OR is_deleted = false)");
                stats.approvals = parseInt(res.rows[0].count);
            } catch (e) { console.warn("Sidebar Stats (Approvals) Error:", e.message); }
            
            // 2. Low Stock Items (Defensive)
            try {
                const res = await pool.query("SELECT COUNT(*) FROM inventory_items WHERE remaining_qty <= min_stock_level AND (is_deleted IS NULL OR is_deleted = false)");
                stats.inventory = parseInt(res.rows[0].count);
            } catch (e) { console.warn("Sidebar Stats (Inventory) Error:", e.message); }
            
            // 3. Strategic Signals (Defensive)
            try {
                const res = await pool.query("SELECT COUNT(*) FROM notifications WHERE severity IN ('critical', 'strategic') AND is_read = false AND (is_deleted IS NULL OR is_deleted = false)");
                stats.command = parseInt(res.rows[0].count);
            } catch (e) { console.warn("Sidebar Stats (Command) Error:", e.message); }

            // 4. Overdue Installments (Defensive - Checks both tables if needed)
            try {
                const res = await pool.query("SELECT COUNT(*) FROM installments WHERE due_date < CURRENT_DATE AND status != 'Paid' AND (is_deleted IS NULL OR is_deleted = false)");
                stats.finance = parseInt(res.rows[0].count);
            } catch (e) { 
                try {
                    const res2 = await pool.query("SELECT COUNT(*) FROM sale_installments WHERE due_date < CURRENT_DATE AND status != 'Paid' AND (is_deleted IS NULL OR is_deleted = false)");
                    stats.finance = parseInt(res2.rows[0].count);
                } catch (e2) {
                    console.warn("Sidebar Stats (Finance) Error:", e2.message); 
                }
            }

            res.json({ success: true, stats });
        } catch (err) { 
            console.error("Global Sidebar Stats Error:", err.message);
            res.json({ 
                success: true, 
                stats: { approvals: 0, inventory: 0, command: 0, finance: 0 },
                warning: "Some stats could not be loaded" 
            }); 
        }
    }
}

module.exports = new SystemController();
