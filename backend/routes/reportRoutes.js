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

        const arRes = await pool.query(`SELECT SUM(amount) as sum FROM installments WHERE status = 'Pending' AND is_deleted = FALSE`);
        const pendingAR = Number(arRes.rows[0]?.sum || 0);

        const lsRes = await pool.query(`SELECT COUNT(*) as cnt FROM inventory WHERE remaining_qty <= min_qty`);
        const lowStockCount = Number(lsRes.rows[0]?.cnt || 0);

        const revRes = await pool.query(`SELECT SUM(amount) as sum FROM payment_receipts ${whereProj}`, params);
        const expRes = await pool.query(`SELECT SUM(net_amount) as sum FROM subcontractor_invoices WHERE status = 'اعتماد مالي' ${whereProjAnd}`, params);
        const netProfit = Number(revRes.rows[0]?.sum || 0) - Number(expRes.rows[0]?.sum || 0);

        const pRes = await pool.query(`SELECT name, budget, expected_profit_percent, actual_profit_percent, management_pct FROM projects ${proj ? "WHERE name = $1" : ""}`, params);
        
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

        res.json({ totalBudget, pendingAR, lowStockCount, netProfit, projects: pRes.rows, partnersBreakdown: processedPartners, partners: processedPartners });
    } catch(e) { 
        console.error("Dashboard Stats Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

router.get('/project_360_stats', async (req, res) => {
    try {
        const projName = req.query.project;
        if (!projName) return res.status(400).json({error: "Project required"});
        
        const pRes = await pool.query("SELECT * FROM projects WHERE name = $1 AND is_deleted = FALSE", [projName]);
        const project = pRes.rows[0] || {};
        const total_budget = Number(project.budget || 0);
        
        const subRes = await pool.query("SELECT SUM(net_amount) as sum FROM subcontractor_invoices WHERE project_name = $1 AND status = 'اعتماد مالي' AND is_deleted = FALSE", [projName]);
        const matRes = await pool.query("SELECT SUM(est_cost) as sum FROM material_usage WHERE project_name = $1 AND is_deleted = FALSE", [projName]);
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
    } catch(e) { 
        console.error("Project 360 Stats Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

router.get('/ceo_dashboard', async (req, res) => {
    try {
        res.json({
            cashflow: { daily: {income:0, due:0}, weekly: {income:0, due:0}, monthly: {income:0, due:0}, annual: {income:0, due:0} },
            breakdown: {}, chartDataDoughnut: null, chartDataBar: null
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/cashflow_projection', async (req, res) => {
    try {
        const q = `
            WITH Incoming AS (
                SELECT TO_CHAR(due_date, 'YYYY-MM') as month, SUM(amount) as total_in
                FROM installments WHERE status != 'Paid' AND is_deleted = FALSE AND due_date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(due_date, 'YYYY-MM') as month, SUM(amount) as total_in
                FROM real_estate_installments WHERE status != 'Paid' AND is_deleted = FALSE AND due_date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(total_amount) as total_in
                FROM ar_invoices WHERE status != 'Paid' AND is_deleted = FALSE AND date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
            ),
            Outgoing AS (
                SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(net_amount) as total_out
                FROM subcontractor_invoices WHERE status = 'اعتماد مالي' AND is_deleted = FALSE AND date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(qty * estimated_cost * fx_rate) as total_out
                FROM purchase_orders WHERE status = 'Pending' AND is_deleted = FALSE AND created_at <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                -- Estimated Recurring Payroll (Fixed: basic_salary + incentives replaced with salary)
                SELECT TO_CHAR(CURRENT_DATE + (n || ' month')::interval, 'YYYY-MM') as month, 
                       (SELECT COALESCE(SUM(salary), 0) FROM staff WHERE status = 'Active' AND is_deleted = FALSE) as total_out
                FROM generate_series(0, 11) n
            ),
            MergedIncoming AS (
                SELECT month, SUM(total_in) as total_in FROM Incoming GROUP BY 1
            ),
            MergedOutgoing AS (
                SELECT month, SUM(total_out) as total_out FROM Outgoing GROUP BY 1
            )
            SELECT 
                COALESCE(i.month, o.month) as month_year,
                COALESCE(i.total_in, 0) as expected_collections,
                COALESCE(o.total_out, 0) as expected_payments,
                (COALESCE(i.total_in, 0) - COALESCE(o.total_out, 0)) as liquidity_gap
            FROM MergedIncoming i
            FULL OUTER JOIN MergedOutgoing o ON i.month = o.month
            ORDER BY 1
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { 
        console.error("Cashflow Projection Error:", e);
        res.status(500).json({ error: e.message }); 
    }
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

router.get('/sub_variance', async (req, res) => {
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

router.get('/aging_payables', async (req, res) => {
    try {
        const q = `
            SELECT s.name as subcontractor_name, i.project_name, SUM(i.net_amount) as total_due, MIN(i.date) as oldest_invoice_date 
            FROM subcontractor_invoices i 
            JOIN subcontractors s ON i.subcontractor_id = s.id 
            WHERE i.status = 'اعتماد مالي' AND i.is_deleted = FALSE AND i.net_amount > COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE received_from = s.name AND type = 'Payment'), 0) 
            GROUP BY s.name, i.project_name 
            ORDER BY total_due DESC
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/boq_tracking', async (req, res) => {
    try {
        const q = `
            SELECT b.project_name, b.item_desc, b.unit, b.est_qty, 
                   COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0) AS assigned_qty, 
                   (b.est_qty - COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0)) AS unassigned_qty, 
                   COALESCE((SELECT SUM(curr_qty) FROM subcontractor_invoices WHERE sub_item_id IN (SELECT id FROM subcontractor_items WHERE boq_id = b.id) AND status='اعتماد مالي' AND is_deleted = FALSE), 0) AS act_qty 
            FROM boq b
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/project_profitability', async (req, res) => {
    try {
        const q = `
            SELECT 
                p.id,
                p.name as project_name,
                p.company,
                p.budget,
                COALESCE((SELECT SUM(net_amount) FROM subcontractor_invoices WHERE project_id = p.id AND is_deleted = FALSE), 0) as sub_costs,
                COALESCE((SELECT SUM(qty * estimated_cost * fx_rate) FROM purchase_orders WHERE project_name = p.name AND is_deleted = FALSE), 0) as proc_costs,
                COALESCE((SELECT SUM(qty * est_cost) FROM material_usage WHERE project_name = p.name AND is_deleted = FALSE), 0) as mat_costs,
                p.management_pct
            FROM projects p
            WHERE p.is_deleted = FALSE
        `;
        const result = await pool.query(q);
        
        const data = result.rows.map(row => {
            const totalCosts = parseFloat(row.sub_costs || 0) + parseFloat(row.proc_costs || 0) + parseFloat(row.mat_costs || 0);
            const budget = parseFloat(row.budget || 0);
            const grossProfit = budget - totalCosts;
            const managementFee = grossProfit * (parseFloat(row.management_pct || 0) / 100);
            const netDistributedProfit = grossProfit - managementFee;
            
            return {
                ...row,
                total_costs: totalCosts,
                gross_profit: grossProfit,
                management_fee: managementFee,
                net_distributed_profit: netDistributedProfit,
                profit_margin_pct: budget > 0 ? ((grossProfit / budget) * 100).toFixed(2) : "0.00"
            };
        });

        res.json({ data });
    } catch(e) { 
        console.error("Project Profitability Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

router.get('/realestate_absorption', async (req, res) => {
    try {
        const q = `
            SELECT 
                p.id,
                p.name as project_name,
                p.total_units as target_units,
                (SELECT COUNT(*) FROM real_estate_units WHERE project_id = p.id AND is_deleted = FALSE) as registered_units,
                (SELECT COUNT(*) FROM real_estate_units WHERE project_id = p.id AND status = 'Sold' AND is_deleted = FALSE) as sold_units,
                (SELECT SUM(price) FROM real_estate_units WHERE project_id = p.id AND status = 'Available' AND is_deleted = FALSE) as available_value,
                (SELECT SUM(total_price) FROM real_estate_contracts WHERE project_name = p.name AND is_deleted = FALSE) as total_sold_value
            FROM real_estate_projects p
            WHERE p.is_deleted = FALSE
        `;
        const result = await pool.query(q);
        
        const data = result.rows.map(row => {
            const sold = parseFloat(row.sold_units || 0);
            const total = parseFloat(row.registered_units || 0);
            return {
                ...row,
                absorption_rate: total > 0 ? ((sold / total) * 100).toFixed(2) : "0.00",
                remaining_inventory_value: parseFloat(row.available_value || 0)
            };
        });
        
        res.json({ data });
    } catch(e) { 
        console.error("Real Estate Absorption Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

router.get('/payroll_efficiency', async (req, res) => {
    try {
        const q = `
            SELECT 
                department,
                COUNT(*) as head_count,
                SUM(COALESCE(salary, 0)) as total_basic,
                0 as total_incentives,
                SUM(COALESCE(salary, 0)) as total_commitment
            FROM staff
            WHERE status = 'Active' AND is_deleted = FALSE
            GROUP BY department
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { 
        console.error("Payroll Efficiency Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

router.get('/trial_balance', async (req, res) => {
    try {
        const q = `
            SELECT 
                coa.account_code, 
                coa.account_name, 
                coa.account_type,
                COALESCE(SUM(l.debit), 0) as total_debit,
                COALESCE(SUM(l.credit), 0) as total_credit,
                COALESCE(SUM(
                    CASE 
                        WHEN coa.account_type IN ('Asset', 'Expense') THEN (l.debit - l.credit)
                        ELSE (l.credit - l.debit)
                    END
                ), 0) as balance
            FROM chart_of_accounts coa
            LEFT JOIN ledger l ON l.account_name = coa.account_name AND l.is_deleted = FALSE
            WHERE coa.is_deleted = FALSE
            GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
            ORDER BY coa.account_code ASC
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;