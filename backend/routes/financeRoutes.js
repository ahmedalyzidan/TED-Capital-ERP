/**
 * Finance & Year-End Closing Routes
 * Handles financial periods, system locks, and Year-End (EOY) routines.
 */

const express = require('express');
const pool = require('../config/db');
const { logAudit, autoLedgerEntry } = require('../utils/helpers');
const financeController = require('../controllers/financeController');

// استدعاء الميدل وير الأمني (بما في ذلك التحقق الثنائي للعمليات الحساسة)
const { authenticateToken, requireAdmin, requireStrict2FA } = require('../middlewares/auth');

const router = express.Router();

// 🌟 تجهيز جداول الفترات المالية آلياً عند تشغيل المسار لأول مرة
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS financial_periods (
                id SERIAL PRIMARY KEY,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                is_closed BOOLEAN DEFAULT FALSE,
                closed_by VARCHAR(100),
                closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(year, month)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS eoy_logs (
                id SERIAL PRIMARY KEY,
                year INTEGER UNIQUE NOT NULL,
                total_revenue NUMERIC(15,2),
                total_expense NUMERIC(15,2),
                net_profit NUMERIC(15,2),
                executed_by VARCHAR(100),
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error("Finance Schema Error:", e.message);
    }
})();

// =====================================================================
// 1. إغلاق أو فتح فترة مالية (شهر محدد)
// =====================================================================
router.post('/periods/close', authenticateToken, requireAdmin, async (req, res) => {
    const { year, month, is_closed } = req.body;
    
    if (!year || !month) return res.status(400).json({ error: "السنة والشهر مطلوبان." });

    try {
        const query = `
            INSERT INTO financial_periods (year, month, is_closed, closed_by, closed_at) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (year, month) 
            DO UPDATE SET is_closed = EXCLUDED.is_closed, closed_by = EXCLUDED.closed_by, closed_at = CURRENT_TIMESTAMP
        `;
        await pool.query(query, [year, month, is_closed, req.user.username]);
        
        const actionText = is_closed ? 'أغلق' : 'فتح';
        await logAudit(req.user.username, 'PERIOD_STATUS', 'financial_periods', null, `تم ${actionText} الفترة المالية: ${month}/${year}`);
        
        res.json({ success: true, message: `تم ${actionText} الفترة بنجاح.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// 2. إقفال السنة المالية (Year-End Closing - EOY)
// ⚠️ هذه العملية فائقة الحساسية، لذلك تتطلب (requireStrict2FA) ⚠️
// =====================================================================
router.post('/execute-eoy', authenticateToken, requireAdmin, requireStrict2FA, async (req, res) => {
    const { year } = req.body;
    if (!year) return res.status(400).json({ error: "يجب تحديد السنة المالية المراد إقفالها." });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. التأكد من أن السنة لم يتم إقفالها مسبقاً
        const checkEoy = await client.query("SELECT id FROM eoy_logs WHERE year = $1", [year]);
        if (checkEoy.rows.length > 0) throw new Error(`تم إقفال السنة المالية ${year} مسبقاً ولا يمكن إقفالها مرة أخرى.`);

        // 2. حساب إجمالي الإيرادات للسنة المحددة (الحسابات التي تبدأ بـ 4)
        const revRes = await client.query(`
            SELECT COALESCE(SUM(credit - debit), 0) as total_rev 
            FROM ledger 
            WHERE EXTRACT(YEAR FROM date) = $1 
            AND account_name IN (SELECT account_name FROM chart_of_accounts WHERE account_code LIKE '4%')
        `, [year]);
        const totalRevenue = parseFloat(revRes.rows[0].total_rev);

        // 3. حساب إجمالي المصروفات والتكاليف (الحسابات التي تبدأ بـ 5 و 6)
        const expRes = await client.query(`
            SELECT COALESCE(SUM(debit - credit), 0) as total_exp 
            FROM ledger 
            WHERE EXTRACT(YEAR FROM date) = $1 
            AND account_name IN (SELECT account_name FROM chart_of_accounts WHERE account_code LIKE '5%' OR account_code LIKE '6%')
        `, [year]);
        const totalExpense = parseFloat(expRes.rows[0].total_exp);

        // 4. حساب صافي الربح أو الخسارة
        const netProfit = totalRevenue - totalExpense;

        // 5. ترحيل صافي الربح إلى حساب (الأرباح المحتجزة - 3300)
        // يتم استخدام حساب "ملخص الدخل" كحساب وسيط إذا لزم الأمر، هنا نرحل مباشرة للتبسيط
        const retainedEarningsAccount = 'الأرباح المحتجزة'; 
        const desc = `قيد إقفال السنة المالية ${year} وترحيل صافي الأرباح/الخسائر`;

        if (netProfit > 0) {
            // حالة الربح
            await autoLedgerEntry(client, retainedEarningsAccount, 'General', 0, netProfit, desc, req.user.username);
        } else if (netProfit < 0) {
            // حالة الخسارة
            await autoLedgerEntry(client, retainedEarningsAccount, 'General', Math.abs(netProfit), 0, desc, req.user.username);
        }

        // 6. تسجيل عملية الإقفال في سجل الـ EOY
        await client.query(
            "INSERT INTO eoy_logs (year, total_revenue, total_expense, net_profit, executed_by) VALUES ($1, $2, $3, $4, $5)",
            [year, totalRevenue, totalExpense, netProfit, req.user.username]
        );

        // 7. إغلاق جميع أشهر هذه السنة لمنع التعديل
        for (let m = 1; m <= 12; m++) {
            await client.query(`
                INSERT INTO financial_periods (year, month, is_closed, closed_by) 
                VALUES ($1, $2, TRUE, $3)
                ON CONFLICT (year, month) DO UPDATE SET is_closed = TRUE, closed_by = EXCLUDED.closed_by
            `, [year, m, req.user.username]);
        }

        await logAudit(req.user.username, 'EXECUTE_EOY', 'eoy_logs', year, `Executed Year-End Closing for ${year}. Net: ${netProfit}`);

        await client.query('COMMIT');
        res.json({ success: true, message: `تم إقفال السنة المالية ${year} بنجاح. صافي الربح/الخسارة: ${netProfit}` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("EOY Closing Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// =====================================================================
// 4. تقارير مالية (Dashboard & Statements)
// =====================================================================
router.post('/reconcile-ic', authenticateToken, financeController.reconcileInterCompany);
router.get('/dashboard', financeController.getFinancialDashboard);
router.get('/ap-balances', financeController.getAPBalances);
router.get('/inventory-valuation', financeController.getInventoryValuation);
router.get('/cash-balances', financeController.getCashBalances);
router.get('/statements', financeController.getFinancialStatements);
router.get('/performance', authenticateToken, financeController.getMonthlyPerformance);
router.get('/budget-comparison', authenticateToken, financeController.getBudgetComparison);

const AccountingService = require('../services/accountingService');
router.get('/integrity', authenticateToken, async (req, res) => {
    try {
        const imbalances = await AccountingService.reconcileLedger(pool);
        const unassigned = await AccountingService.checkUnassignedEntities(pool);
        res.json({ success: true, imbalances, unassignedCount: unassigned.length, unassigned });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/integrity/fix-legacy', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const fixedCount = await AccountingService.autoAssignLegacyEntries(pool);
        res.json({ success: true, fixedCount, message: `تم تخصيص ${fixedCount} قيد تاريخي بنجاح.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================================
// 5. جلب الفترات المالية (Financial Periods)
// =====================================================================
router.get('/periods', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM financial_periods ORDER BY year DESC, month DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. قفل وفتح النظام بالكامل (حالة الطوارئ / المراجعة)
// =====================================================================
router.post('/system-lock', authenticateToken, requireAdmin, requireStrict2FA, async (req, res) => {
    const { is_locked } = req.body;
    
    try {
        const val = is_locked ? 'true' : 'false';
        await pool.query("DELETE FROM system_parameters WHERE category = 'SYSTEM_LOCKED'");
        await pool.query("INSERT INTO system_parameters (category, value) VALUES ('SYSTEM_LOCKED', $1)", [val]);
        
        // تحديث متغير البيئة ليعمل فوراً دون إعادة تشغيل السيرفر
        process.env.SYSTEM_LOCKED = val;

        const actionText = is_locked ? 'إيقاف النظام بالكامل' : 'إعادة تشغيل النظام';
        await logAudit(req.user.username, 'SYSTEM_LOCK', 'system_parameters', null, actionText);

        res.json({ success: true, message: `تم ${actionText} بنجاح.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================================
// 4. التقارير المالية (Financial Statements)
// =====================================================================
module.exports = router;