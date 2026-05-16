const pool = require('../config/db');
const { logAudit } = require('../utils/helpers');
const AccountingService = require('../services/accountingService');

class ProjectController {
    async getProjectsDropdown(req, res) {
        try {
            const projects = await pool.query("SELECT id, name FROM projects");
            res.json({ success: true, data: projects.rows });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getSubcontractorItems(req, res) {
        try {
            const items = await pool.query("SELECT * FROM subcontractor_items WHERE subcontractor_id = $1", [req.params.sub_id]);
            res.json({ data: items.rows });
        } catch(err) { 
            res.status(500).json({error: err.message}); 
        }
    }

    async getBOQSubcontractors(req, res) {
        try {
            const subs = await pool.query(`SELECT si.*, s.name as sub_name FROM subcontractor_items si LEFT JOIN subcontractors s ON si.subcontractor_id = s.id WHERE si.boq_id = $1`, [req.params.boq_id]);
            res.json({ data: subs.rows });
        } catch (err) { 
            res.status(500).json({ error: err.message }); 
        }
    }

    async getBOQInvoices(req, res) {
        try {
            const invs = await pool.query(`SELECT i.*, s.name as sub_name FROM subcontractor_invoices i LEFT JOIN subcontractors s ON i.subcontractor_id = s.id WHERE i.sub_item_id IN (SELECT id FROM subcontractor_items WHERE boq_id = $1)`, [req.params.boq_id]);
            res.json({ data: invs.rows });
        } catch (err) { 
            res.status(500).json({ error: err.message }); 
        }
    }

    /**
     * ترحيل توزيع الأرباح آلياً للشركاء (Automated Bulk Profit Distribution)
     */
    async distributeProfit(req, res) {
        const { project_id } = req.params;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. جلب بيانات المشروع
            const projRes = await client.query(`
                SELECT name, actual_profit, management_profit_amount, is_profit_distributed 
                FROM projects WHERE id = $1
            `, [project_id]);

            if (projRes.rows.length === 0) throw new Error("المشروع غير موجود");
            const project = projRes.rows[0];

            if (project.is_profit_distributed) throw new Error("تم توزيع أرباح هذا المشروع مسبقاً");

            const actualProfit = parseFloat(project.actual_profit) || 0;
            const managementShare = parseFloat(project.management_profit_amount) || 0;
            const distributableProfit = actualProfit - managementShare;

            if (distributableProfit <= 0) throw new Error("لا يوجد ربح قابل للتوزيع بعد خصم نصيب الإدارة");

            // 2. جلب الشركاء المرتبطين بالمشروع
            const partnersRes = await client.query(`
                SELECT id, name, investment_percentage 
                FROM partners 
                WHERE project_name = $1 AND (partner_type = 'Partner' OR partner_type IS NULL)
            `, [project.name]);

            if (partnersRes.rows.length === 0) throw new Error("لا يوجد شركاء مستثمرين مسجلين لهذا المشروع");

            // 3. معالجة كل شريك
            for (const partner of partnersRes.rows) {
                const percentage = parseFloat(partner.investment_percentage) || 0;
                const partnerShare = (distributableProfit * percentage / 100).toFixed(2);

                if (partnerShare > 0) {
                    // أ. تسجيل الحركة في سجل حركات الشركاء
                    await client.query(`
                        INSERT INTO partner_transactions (partner_id, type, amount, date, description, created_at)
                        VALUES ($1, 'Profit Distribution', $2, CURRENT_DATE, $3, CURRENT_TIMESTAMP)
                    `, [partner.id, partnerShare, `توزيع أرباح مشروع: ${project.name}`]);

                    // ب. ترحيل القيد المحاسبي الآلي (Double Entry)
                    // مدين: 3300 (الأرباح المحتجزة)
                    // دائن: 3200 (جاري الشركاء)
                    await AccountingService.recordDoubleEntry(client, {
                        debitAccount: '3300', // الأرباح المحتجزة
                        creditAccount: '3200', // جاري الشركاء
                        amount: partnerShare,
                        costCenter: project.name,
                        description: `توزيع أرباح شريك: ${partner.name} - مشروع: ${project.name}`,
                        username: req.user?.username || 'System',
                        referenceNo: `PRJ-DIST-${project_id}`
                    });
                }
            }

            // 4. تحديث حالة المشروع
            await client.query(`UPDATE projects SET is_profit_distributed = TRUE WHERE id = $1`, [project_id]);

            await client.query('COMMIT');
            res.json({ success: true, message: `تم ترحيل أرباح المشروع بنجاح على ${partnersRes.rows.length} شريك.` });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("❌ Distribution Error:", err.message);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }

    /**
     * توليد رقم مسلسل فريد للمشروع (PRJ-YYYY-XXX)
     */
    async generateProjectSerial() {
        try {
            const year = new Date().getFullYear();
            const seqRes = await pool.query("SELECT nextval('project_serial_seq')");
            const nextVal = seqRes.rows[0].nextval;
            return `PRJ-${year}-${nextVal.toString().padStart(3, '0')}`;
        } catch (err) {
            console.error("❌ Error generating project serial:", err.message);
            return `PRJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
        }
    }
    /**
     * مزامنة البيانات المالية للمشروع مع دفتر اليومية (Recalculate from Ledger)
     */
    /**
     * مزامنة البيانات المالية للمشروع مع دفتر اليومية (Recalculate from Ledger)
     */
    async syncProject(req, res) {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. جلب بيانات المشروع
            // إضافة Casting صريح لتفادي مشاكل الأنواع في PostgreSQL
            const projRes = await client.query("SELECT name, budget FROM projects WHERE id = $1::integer", [id]);
            if (projRes.rows.length === 0) throw new Error("المشروع غير موجود");
            const { name: projectName, budget } = projRes.rows[0];

            // 2. حساب الإجماليات من دفتر اليومية (Ledger)
            const ledgerRes = await client.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN c.account_type = 'Revenue' THEN (CAST(l.credit AS NUMERIC) - CAST(l.debit AS NUMERIC)) ELSE 0 END), 0) as total_revenue,
                    COALESCE(SUM(CASE WHEN c.account_type = 'Expense' THEN (CAST(l.debit AS NUMERIC) - CAST(l.credit AS NUMERIC)) ELSE 0 END), 0) as total_expenses
                FROM ledger l
                JOIN chart_of_accounts c ON l.account_name = c.account_name
                WHERE l.cost_center = $1::text
            `, [projectName]);

            const { total_revenue, total_expenses } = ledgerRes.rows[0];
            const actualProfit = (parseFloat(total_revenue) || 0) - (parseFloat(total_expenses) || 0);
            const numBudget = parseFloat(budget) || 0;

            // 3. تحديث جدول المشاريع
            // حل مشكلة "inconsistent types deduced for parameter $1" عن طريق التحديد الصريح للنوع
            await client.query(`
                UPDATE projects 
                SET actual_profit = $1::numeric, 
                    actual_profit_percent = CASE WHEN $2::numeric > 0 THEN ($1::numeric / $2::numeric * 100) ELSE 0 END
                WHERE id = $3::integer
            `, [actualProfit, numBudget, id]);

            // 4. تسجيل العملية في سجل التدقيق
            await logAudit(req.user?.username || 'System', 'SYNC_FINANCIALS', 'projects', id, `تمت مزامنة البيانات المالية للمشروع: ${projectName}`);

            await client.query('COMMIT');
            res.json({ success: true, actualProfit, total_revenue, total_expenses });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("❌ Sync Project Error:", err.message);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }
}

module.exports = new ProjectController();
