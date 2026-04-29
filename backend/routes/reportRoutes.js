const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/dashboard_stats', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];
        const whereProj = proj ? "WHERE project_name = $1" : "";
        const whereProjAnd = proj ? "AND project_name = $1" : "";

        const bRes = await pool.query(`SELECT SUM(budget) as sum FROM projects ${proj ? "WHERE name = $1" : ""}`, params);
        const totalBudget = Number(bRes.rows[0]?.sum || 0);

        const arRes = await pool.query(`SELECT SUM(amount) as sum FROM installments WHERE status = 'Pending'`);
        const pendingAR = Number(arRes.rows[0]?.sum || 0);

        const lsRes = await pool.query(`SELECT COUNT(*) as cnt FROM inventory WHERE remaining_qty <= min_qty`);
        const lowStockCount = Number(lsRes.rows[0]?.cnt || 0);

        const revRes = await pool.query(`SELECT SUM(amount) as sum FROM payment_receipts ${whereProj}`, params);
        const expRes = await pool.query(`SELECT SUM(net_amount) as sum FROM subcontractor_invoices WHERE status = 'اعتماد مالي' ${whereProjAnd}`, params);
        const netProfit = Number(revRes.rows[0]?.sum || 0) - Number(expRes.rows[0]?.sum || 0);

        const pRes = await pool.query(`SELECT name, budget, expected_profit_percent, actual_profit_percent, management_pct FROM projects ${proj ? "WHERE name = $1" : ""}`, params);
        
        // 1- إصلاح مشكلة Partner Financials بجلب الإيداعات والمسحوبات لتكتمل المصفوفة
        const partnersRes = await pool.query(`
            SELECT p.*,
                   COALESCE((SELECT SUM(amount) FROM partner_deposits WHERE partner_id = p.id), 0) AS total_deposits,
                   COALESCE((SELECT SUM(amount) FROM partner_withdrawals WHERE partner_id = p.id), 0) AS total_withdrawals
            FROM partners p ${whereProj}
        `, params);
        
        const processedPartners = partnersRes.rows.map(p => {
            const mgmtFees = netProfit * ((p.management_rate || 0) / 100);
            const remainingProfit = netProfit - mgmtFees;
            const actualProfit = remainingProfit * ((p.expected_profit_rate || p.share_percent || 0) / 100);
            return {
                ...p,
                partner_name: p.name,
                management_fee: mgmtFees,
                actual_profit: actualProfit,
                total_deposits: Number(p.total_deposits),
                total_withdrawals: Number(p.total_withdrawals)
            };
        });

        // تم إضافة 'partners' لكي يقرأها المتغير في dashboards.js
        res.json({ totalBudget, pendingAR, lowStockCount, netProfit, projects: pRes.rows, partnersBreakdown: processedPartners, partners: processedPartners });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 6- إضافة مسار project_360_stats لمعالجة الأرقام في لوحة تحكم المشاريع
router.get('/project_360_stats', async (req, res) => {
    try {
        const projName = req.query.project;
        if (!projName) return res.status(400).json({error: "Project required"});
        
        const pRes = await pool.query("SELECT * FROM projects WHERE name = $1", [projName]);
        const project = pRes.rows[0] || {};
        const total_budget = Number(project.budget || 0);
        
        const subRes = await pool.query("SELECT SUM(net_amount) as sum FROM subcontractor_invoices WHERE project_name = $1 AND status = 'اعتماد مالي'", [projName]);
        const matRes = await pool.query("SELECT SUM(est_cost) as sum FROM material_usage WHERE project_name = $1", [projName]);
        const total_costs = Number(subRes.rows[0]?.sum || 0) + Number(matRes.rows[0]?.sum || 0);
        
        const tasks = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed FROM tasks WHERE project_name = $1", [projName]);
        const task_completion_pct = Number(tasks.rows[0]?.total) > 0 ? (Number(tasks.rows[0]?.completed) / Number(tasks.rows[0]?.total)) * 100 : 0;
        
        const mp = await pool.query("SELECT SUM(manpower_count) as mp FROM daily_reports WHERE project_name = $1", [projName]);
        const manpower_count = Number(mp.rows[0]?.mp || 0);
        
        const burn_series = [0, total_costs * 0.5, total_costs];
        const burn_categories = ['البداية', 'منتصف المدة', 'الوضع الحالي'];
        const recent_events = []; 
        
        res.json({
            total_budget,
            total_costs,
            task_completion_pct: Number(task_completion_pct.toFixed(1)),
            manpower_count,
            burn_series,
            burn_categories,
            recent_events
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/ceo_dashboard', async (req, res) => {
    try {
        res.json({
            cashflow: { daily: {income:0, due:0}, weekly: {income:0, due:0}, monthly: {income:0, due:0}, annual: {income:0, due:0} },
            breakdown: {}, chartDataDoughnut: null, chartDataBar: null
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/cashflow_projection', async (req, res) => {
    try {
        const q = `
            WITH Incoming AS (
                SELECT TO_CHAR(due_date, 'YYYY-MM') as month, SUM(amount) as total_in
                FROM installments WHERE status != 'Paid' AND due_date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
            ),
            Outgoing AS (
                SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(net_amount) as total_out
                FROM subcontractor_invoices WHERE status = 'اعتماد مالي' AND date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
            )
            SELECT 
                COALESCE(i.month, o.month) as month_year,
                COALESCE(i.total_in, 0) as expected_collections,
                COALESCE(o.total_out, 0) as expected_payments,
                (COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0)) as liquidity_gap
            FROM Incoming i
            FULL OUTER JOIN Outgoing o ON i.month = o.month
            ORDER BY 1
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/gl_summary', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];
        const whereProj = proj ? "WHERE project_name = $1" : "";
        const whereProjAnd = proj ? "AND project_name = $1" : "";

        const revRes = await pool.query(`SELECT SUM(amount) as sum FROM payment_receipts ${whereProj}`, params);
        const subRes = await pool.query(`SELECT SUM(net_amount) as sum FROM subcontractor_invoices WHERE status = 'اعتماد مالي' ${whereProjAnd}`, params);
        const matRes = await pool.query(`SELECT SUM(est_cost) as sum FROM material_usage ${whereProj}`, params);
        
        const pl = {
            revenue: Number(revRes.rows[0]?.sum || 0),
            subs: Number(subRes.rows[0]?.sum || 0),
            payroll: 0, 
            material: Number(matRes.rows[0]?.sum || 0),
            expenses: 0
        };
        const bs = { assets: 0, liabilities: 0, equity: 0 };
        res.json({ pl, bs });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/realestate_stats', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];
        const whereProj = proj ? "WHERE project_name = $1" : "";

        const uVal = await pool.query(`SELECT SUM(price) as sum FROM property_units ${whereProj}`, params);
        const cVal = await pool.query(`SELECT SUM(total_value) as sum FROM contracts ${whereProj ? "WHERE unit_id IN (SELECT id FROM property_units WHERE project_name = $1)" : ""}`, params);
        
        res.json({ unitsValue: Number(uVal.rows[0]?.sum || 0), contractsValue: Number(cVal.rows[0]?.sum || 0), pendingInstallments: 0, totalCollected: 0 });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/pi_stats', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];
        const whereProj = proj ? "WHERE project_name = $1" : "";

        const po = await pool.query(`SELECT SUM(qty * estimated_cost) as sum FROM purchase_orders ${whereProj}`, params);
        const inv = await pool.query(`SELECT SUM(remaining_qty * buy_price) as sum FROM inventory`);
        const mat = await pool.query(`SELECT SUM(qty) as sum FROM material_usage ${whereProj}`, params);

        res.json({
            totalPO: Number(po.rows[0]?.sum || 0), inventoryValue: Number(inv.rows[0]?.sum || 0),
            totalIssued: Number(mat.rows[0]?.sum || 0), totalReturned: 0, pendingRFQ: 0, activeSubs: 0, lowStock: 0, totalTransfers: 0
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/sub_variance', async (req, res) => {
    try {
        const q = `
            SELECT s.name as subcontractor_name, si.item_desc, si.assigned_qty, 
                   si.unit_price as sub_price, b.unit_price as original_boq_price, 
                   (b.unit_price - si.unit_price)*si.assigned_qty as variance_profit 
            FROM subcontractor_items si 
            JOIN subcontractors s ON si.subcontractor_id = s.id 
            JOIN boq b ON si.boq_id = b.id
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/aging_payables', async (req, res) => {
    try {
        const q = `
            SELECT s.name as subcontractor_name, i.project_name, SUM(i.net_amount) as total_due, MIN(i.date) as oldest_invoice_date 
            FROM subcontractor_invoices i 
            JOIN subcontractors s ON i.subcontractor_id = s.id 
            WHERE i.status = 'اعتماد مالي' AND i.net_amount > COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE received_from = s.name AND type = 'Payment'), 0) 
            GROUP BY s.name, i.project_name 
            ORDER BY total_due DESC
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/boq_tracking', async (req, res) => {
    try {
        const q = `
            SELECT b.project_name, b.item_desc, b.unit, b.est_qty, 
                   COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0) AS assigned_qty, 
                   (b.est_qty - COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0)) AS unassigned_qty, 
                   COALESCE((SELECT SUM(curr_qty) FROM subcontractor_invoices WHERE sub_item_id IN (SELECT id FROM subcontractor_items WHERE boq_id = b.id) AND status='اعتماد مالي'), 0) AS act_qty 
            FROM boq b
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;