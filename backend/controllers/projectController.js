const pool = require('../config/db');
const { logAudit, syncProjectFinancials } = require('../utils/helpers');
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
            
            // جلب بيانات المشروع للتأكد من وجوده
            const projRes = await client.query("SELECT name FROM projects WHERE id = $1::integer", [id]);
            if (projRes.rows.length === 0) throw new Error("المشروع غير موجود");
            const { name: projectName } = projRes.rows[0];

            // مزامنة البيانات المالية باستخدام الدالة الموحدة
            const syncResult = await syncProjectFinancials(id, client);
            if (!syncResult) throw new Error("فشلت عملية مزامنة البيانات المالية للمشروع");

            const { actualProfit, total_revenue, total_expenses } = syncResult;

            // تسجيل العملية في سجل التدقيق
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

    /**
     * تسجيل تحصيل دفعة من عميل مع ترحيل قيد اليومية ومزامنة المشروع
     */
    async recordCollection(req, res) {
        const {
            project_id,
            client_id,
            amount,
            payment_date,
            payment_method,
            reference_no,
            notes,
            valuation_id,
            source_account
        } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const username = req.user?.username || 'System';

            let customerId = client_id || null;
            let clientName = 'عميل عام';
            let resolvedCompany = 'TED Capital';
            let resolvedCompanyId = 1;
            let costCenter = 'General';
            let project = null;

            if (project_id) {
                // 1. جلب بيانات المشروع
                const projRes = await client.query("SELECT id, name, client_name, company, company_id, budget FROM projects WHERE id = $1::integer", [project_id]);
                if (projRes.rows.length === 0) throw new Error("المشروع غير موجود");
                project = projRes.rows[0];
                clientName = project.client_name || 'عميل عام';
                resolvedCompany = project.company || 'TED Capital';
                resolvedCompanyId = project.company_id || 1;
                costCenter = project.name;

                // البحث عن معرّف العميل المطابق لاسم عميل المشروع إن لم يرسل صراحة
                if (!customerId && project.client_name) {
                    const custRes = await client.query("SELECT id FROM customers WHERE name ILIKE $1 LIMIT 1", [project.client_name]);
                    if (custRes.rows.length > 0) {
                        customerId = custRes.rows[0].id;
                    }
                }
            } else {
                // تحصيل عام بدون مشروع
                if (!customerId) throw new Error("يجب تحديد العميل عند التحصيل العام");
                const custRes = await client.query("SELECT id, name, company, company_id FROM customers WHERE id = $1", [customerId]);
                if (custRes.rows.length === 0) throw new Error("العميل غير موجود");
                const customer = custRes.rows[0];
                clientName = customer.name;
                resolvedCompany = customer.company || 'TED Capital';
                resolvedCompanyId = customer.company_id || 1;
                costCenter = 'General';
            }

            // 3. إدراج الحركة في جدول تاريخ مدفوعات العملاء (client_payment_history)
            const insertQuery = `
                INSERT INTO client_payment_history (
                    client_id, amount_paid, payment_date, payment_method, reference_no, notes, project_id, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
            `;
            const details = notes || (project_id ? `تحصيل دفعة لمشروع: ${project.name}` : `تحصيل دفعة عامة من العميل: ${clientName}`);
            const metadata = {
                project_id: project_id || null,
                project_name: project ? project.name : 'عام',
                valuation_id: valuation_id || null,
                payment_method: payment_method || 'نقدًا',
                reference_no: reference_no || null,
                source_account: source_account || 'صندوق نقدية - تيد كابيتال'
            };

            const payRes = await client.query(insertQuery, [
                customerId,
                parseFloat(amount),
                payment_date || new Date(),
                payment_method || 'نقدًا',
                reference_no || null,
                details,
                project_id || null,
                JSON.stringify(metadata)
            ]);
            const paymentId = payRes.rows[0].id;

            // 4. قيد اليومية المزدوج (Double-Entry Posting)
            // مدين: حساب الصندوق/البنك (source_account أو الافتراضي 'صندوق نقدية - تيد كابيتال')
            // دائن: حساب العملاء ('1120')
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: source_account || 'صندوق نقدية - تيد كابيتال',
                creditAccount: '1120',
                amount: parseFloat(amount),
                costCenter: costCenter,
                description: `تحصيل دفعة من العميل: ${clientName} | ${details}`,
                username: username,
                referenceNo: reference_no || `COL-${paymentId}`,
                companyId: resolvedCompanyId,
                company: resolvedCompany
            });

            // 4.5 تحديث حالة الفاتورة/المستخلص إذا تم ربطه
            if (valuation_id) {
                const invRes = await client.query("SELECT total_amount FROM ar_invoices WHERE id = $1", [valuation_id]);
                if (invRes.rows.length > 0) {
                    const totalAmount = parseFloat(invRes.rows[0].total_amount || 0);
                    const paidRes = await client.query(`
                        SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
                        FROM client_payment_history
                        WHERE is_deleted = false
                          AND (CASE WHEN metadata->>'valuation_id' ~ '^[0-9]+$' THEN (metadata->>'valuation_id')::integer ELSE NULL END) = $1
                    `, [valuation_id]);
                    const totalPaid = parseFloat(paidRes.rows[0].total_paid || 0);

                    const newStatus = totalPaid >= totalAmount ? 'Paid' : 'Partially Paid';
                    await client.query("UPDATE ar_invoices SET status = $1 WHERE id = $2", [newStatus, valuation_id]);
                }
            }

            // 5. تسجيل العملية في سجل التدقيق
            await logAudit(username, 'CLIENT_COLLECTION', 'client_payment_history', paymentId, `تم تسجيل تحصيل دفعة بقيمة ${amount} للعميل ${clientName}`);

            await client.query('COMMIT');

            // 6. مزامنة البيانات المالية للمشروع آلياً (فقط إذا كانت الدفعة لمشروع محدد)
            if (project_id && project) {
                const syncClient = await pool.connect();
                try {
                    await syncProjectFinancials(project.id, syncClient);
                    await logAudit(username, 'SYNC_FINANCIALS', 'projects', project.id, `تمت مزامنة البيانات المالية للمشروع: ${project.name}`);
                } catch (syncErr) {
                    console.error("❌ Auto Sync Project Error during Collection Posting:", syncErr.message);
                } finally {
                    syncClient.release();
                }
            }

            res.json({ success: true, paymentId });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("❌ Record Collection Error:", err.message);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }
}

module.exports = new ProjectController();
