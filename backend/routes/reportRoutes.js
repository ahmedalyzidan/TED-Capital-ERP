const express = require('express');
const pool = require('../config/db');

const router = express.Router();

function resolveAllowedCompanies(req) {
    if (!req.user) return null;

    const username = (req.user.username || '').toUpperCase();
    const isMtayem = username === 'MTAYEM';
    const isMsobhi = username === 'MSOBHI';
    const selectedComp = req.user.selectedCompany;

    const mapComp = (c) => {
        if (!c) return null;
        const nameLower = c.toLowerCase();
        if (nameLower.includes('design') || nameLower.includes('ديزاين')) {
            return { id: 2, name: 'Design Concept' };
        }
        if (nameLower.includes('master') || nameLower.includes('ماستر')) {
            return { id: 3, name: 'Master Builder' };
        }
        if (nameLower.includes('prime') || nameLower.includes('فارما') || nameLower.includes('بريم')) {
            return { id: 4, name: 'PRIMEMED PHARMA' };
        }
        if (nameLower.includes('ted') || nameLower.includes('تيد')) {
            return { id: 1, name: 'TED Capital' };
        }
        return null;
    };

    // If user has chosen a specific company (and it's not the "all" wildcard)
    if (selectedComp && !['all', 'كل الشركات', 'all companies'].includes(selectedComp.toLowerCase())) {
        const resolved = mapComp(selectedComp);
        if (resolved) {
            // Apply security constraints for MTAYEM & MSOBHI
            if (isMtayem && ![1, 4].includes(resolved.id)) {
                return { ids: [1, 4], names: ['TED Capital', 'PRIMEMED PHARMA'] };
            }
            if (isMsobhi && resolved.id !== 2) {
                return { ids: [2], names: ['Design Concept'] };
            }
            return { ids: [resolved.id], names: [resolved.name] };
        }
    }

    // Default allowed scopes when no specific company is selected
    if (isMtayem) {
        return { ids: [1, 4], names: ['TED Capital', 'PRIMEMED PHARMA'] };
    }
    if (isMsobhi) {
        return { ids: [2], names: ['Design Concept'] };
    }

    // If user has a linked company in their database profile
    if (req.user.linkedCompany) {
        const resolved = mapComp(req.user.linkedCompany);
        if (resolved) {
            return { ids: [resolved.id], names: [resolved.name] };
        }
    }

    return null; // Admin / Super Admin (unrestricted)
}

router.get('/dashboard_stats', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];

        const allowed = resolveAllowedCompanies(req);
        let projectClause = "";
        let installmentClause = "";
        let inventoryClause = "";
        let paymentClause = "";
        let invoiceClause = "";
        let partnerClause = "";

        if (allowed) {
            // Validate project name parameter if provided
            if (proj) {
                const check = await pool.query(`SELECT 1 FROM projects WHERE name = $1 AND (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`, [proj]);
                if (check.rows.length === 0) {
                    return res.json({ totalBudget: 0, pendingAR: 0, lowStockCount: 0, netProfit: 0, projects: [], partnersBreakdown: [], partners: [] });
                }
            }

            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            projectClause = `AND ${projectCond}`;
            installmentClause = `AND contract_id IN (SELECT id FROM contracts WHERE project_name IN (SELECT name FROM projects WHERE ${projectCond}))`;
            inventoryClause = `AND (project_name IN (SELECT name FROM projects WHERE ${projectCond}) OR company_id IN (${allowed.ids.join(',')}) OR warehouse IN ('غزة - المستودع الرئيسي', 'المخزن الرئيسي', 'مخزن الصيدليات والأدوية'))`;
            paymentClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
            invoiceClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
            partnerClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const bRes = await pool.query(`SELECT SUM(budget) as sum FROM projects WHERE is_deleted = FALSE ${proj ? "AND name = $1" : ""} ${projectClause}`, params);
        const totalBudget = Number(bRes.rows[0]?.sum || 0);

        const arRes = await pool.query(`SELECT SUM(amount) as sum FROM installments WHERE status = 'Pending' AND is_deleted = FALSE ${installmentClause}`);
        const pendingAR = Number(arRes.rows[0]?.sum || 0);

        const lsRes = await pool.query(`SELECT COUNT(*) as cnt FROM inventory_items WHERE remaining_qty <= min_stock_level AND is_deleted = FALSE ${inventoryClause}`);
        const lowStockCount = Number(lsRes.rows[0]?.cnt || 0);

        const revRes = await pool.query(`
            SELECT SUM(pr.amount) as sum 
            FROM payment_receipts pr
            LEFT JOIN installments inst ON pr.installment_id = inst.id
            LEFT JOIN contracts c ON inst.contract_id = c.id
            WHERE pr.is_deleted = FALSE 
            ${proj ? "AND c.project_name = $1" : ""} 
            ${allowed ? `AND c.project_name IN (SELECT name FROM projects WHERE (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')})))` : ""}
        `, params);

        const expRes = await pool.query(`
            SELECT SUM(si.net_amount) as sum 
            FROM subcontractor_invoices si
            LEFT JOIN projects p ON si.project_id = p.id
            WHERE si.status = 'اعتماد مالي' AND si.is_deleted = FALSE 
            ${proj ? "AND p.name = $1" : ""} 
            ${allowed ? `AND p.name IN (SELECT name FROM projects WHERE (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')})))` : ""}
        `, params);

        const netProfit = Number(revRes.rows[0]?.sum || 0) - Number(expRes.rows[0]?.sum || 0);

        const pRes = await pool.query(`SELECT name, budget, expected_profit_percent, actual_profit_percent, management_pct FROM projects WHERE is_deleted = FALSE ${proj ? "AND name = $1" : ""} ${projectClause}`, params);

        const partnersRes = await pool.query(`
            SELECT p.*,
                   COALESCE((SELECT SUM(amount) FROM partner_deposits WHERE partner_id = p.id), 0) AS total_deposits,
                   COALESCE((SELECT SUM(amount) FROM partner_withdrawals WHERE partner_id = p.id), 0) AS total_withdrawals
            FROM partners p WHERE p.is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${partnerClause}
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
    } catch (e) {
        console.error("Dashboard Stats Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/project_360_stats', async (req, res) => {
    try {
        const projName = req.query.project;
        if (!projName) return res.status(400).json({ error: "Project required" });

        const allowed = resolveAllowedCompanies(req);
        if (allowed) {
            const check = await pool.query(`
                SELECT 1 FROM projects 
                WHERE name = $1 AND (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))
            `, [projName]);
            if (check.rows.length === 0) {
                return res.status(403).json({ error: "Access Denied: Project belongs to another company." });
            }
        }

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
    } catch (e) {
        console.error("Project 360 Stats Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/ceo_dashboard', async (req, res) => {
    try {
        res.json({
            cashflow: { daily: { income: 0, due: 0 }, weekly: { income: 0, due: 0 }, monthly: { income: 0, due: 0 }, annual: { income: 0, due: 0 } },
            breakdown: {}, chartDataDoughnut: null, chartDataBar: null
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/cashflow_projection', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let instFilter = "AND is_deleted = FALSE";
        let reInstFilter = "AND is_deleted = FALSE";
        let arFilter = "AND is_deleted = FALSE";
        let subFilter = "AND is_deleted = FALSE";
        let poFilter = "AND is_deleted = FALSE";
        let staffFilter = "AND is_deleted = FALSE";

        if (allowed) {
            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            instFilter += ` AND contract_id IN (SELECT id FROM contracts WHERE project_name IN (SELECT name FROM projects WHERE ${projectCond}))`;
            reInstFilter += ` AND contract_id IN (SELECT id FROM real_estate_contracts WHERE project_name IN (SELECT name FROM projects WHERE ${projectCond}))`;
            arFilter += ` AND project_id IN (SELECT id FROM projects WHERE ${projectCond})`;
            subFilter += ` AND project_id IN (SELECT id FROM projects WHERE ${projectCond})`;
            poFilter += ` AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
            staffFilter += ` AND company IN (${allowed.names.map(n => `'${n}'`).join(',')})`;
        }

        const q = `
            WITH Incoming AS (
                SELECT TO_CHAR(due_date, 'YYYY-MM') as month, SUM(amount) as total_in
                FROM installments WHERE status != 'Paid' ${instFilter} AND due_date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(due_date, 'YYYY-MM') as month, SUM(amount) as total_in
                FROM real_estate_installments WHERE status != 'Paid' ${reInstFilter} AND due_date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(total_amount) as total_in
                FROM ar_invoices WHERE status != 'Paid' ${arFilter} AND date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
            ),
            Outgoing AS (
                SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(net_amount) as total_out
                FROM subcontractor_invoices WHERE status = 'اعتماد مالي' ${subFilter} AND date <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(qty * estimated_cost * fx_rate) as total_out
                FROM purchase_orders WHERE status = 'Pending' ${poFilter} AND created_at <= CURRENT_DATE + INTERVAL '1 year'
                GROUP BY 1
                UNION ALL
                -- Estimated Recurring Payroll
                SELECT TO_CHAR(CURRENT_DATE + (n || ' month')::interval, 'YYYY-MM') as month, 
                       (SELECT COALESCE(SUM(salary), 0) FROM staff WHERE status = 'Active' ${staffFilter}) as total_out
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
    } catch (e) {
        console.error("Cashflow Projection Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/gl_summary', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];

        const allowed = resolveAllowedCompanies(req);
        let paymentClause = "";
        let subInvoiceClause = "";
        let materialClause = "";

        if (allowed) {
            if (proj) {
                const check = await pool.query(`SELECT 1 FROM projects WHERE name = $1 AND (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`, [proj]);
                if (check.rows.length === 0) {
                    return res.json({ pl: { revenue: 0, subs: 0, payroll: 0, material: 0, expenses: 0 }, bs: { assets: 0, liabilities: 0, equity: 0 } });
                }
            }

            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            paymentClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
            subInvoiceClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
            materialClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const revRes = await pool.query(`SELECT SUM(amount) as sum FROM payment_receipts WHERE is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${paymentClause}`, params);
        const subRes = await pool.query(`SELECT SUM(net_amount) as sum FROM subcontractor_invoices WHERE status = 'اعتماد مالي' AND is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${subInvoiceClause}`, params);
        const matRes = await pool.query(`SELECT SUM(est_cost) as sum FROM material_usage WHERE is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${materialClause}`, params);

        const pl = {
            revenue: Number(revRes.rows[0]?.sum || 0),
            subs: Number(subRes.rows[0]?.sum || 0),
            payroll: 0,
            material: Number(matRes.rows[0]?.sum || 0),
            expenses: 0
        };
        const bs = { assets: 0, liabilities: 0, equity: 0 };
        res.json({ pl, bs });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/realestate_stats', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];

        const allowed = resolveAllowedCompanies(req);
        let projectClause = "";

        if (allowed) {
            if (proj) {
                const check = await pool.query(`SELECT 1 FROM projects WHERE name = $1 AND (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`, [proj]);
                if (check.rows.length === 0) {
                    return res.json({ unitsValue: 0, contractsValue: 0, pendingInstallments: 0, totalCollected: 0 });
                }
            }

            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            projectClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const uVal = await pool.query(`SELECT SUM(price) as sum FROM property_units WHERE is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${projectClause}`, params);
        const cVal = await pool.query(`SELECT SUM(total_value) as sum FROM contracts WHERE is_deleted = FALSE ${proj ? "WHERE unit_id IN (SELECT id FROM property_units WHERE project_name = $1)" : ""} ${projectClause}`, params);

        res.json({ unitsValue: Number(uVal.rows[0]?.sum || 0), contractsValue: Number(cVal.rows[0]?.sum || 0), pendingInstallments: 0, totalCollected: 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/pi_stats', async (req, res) => {
    try {
        const proj = req.query.project || '';
        const params = proj ? [proj] : [];

        const allowed = resolveAllowedCompanies(req);
        let poClause = "";
        let invClause = "";
        let matClause = "";

        if (allowed) {
            if (proj) {
                const check = await pool.query(`SELECT 1 FROM projects WHERE name = $1 AND (company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`, [proj]);
                if (check.rows.length === 0) {
                    return res.json({ totalPO: 0, inventoryValue: 0, totalIssued: 0, totalReturned: 0, pendingRFQ: 0, activeSubs: 0, lowStock: 0, totalTransfers: 0 });
                }
            }

            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            poClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
            invClause = `WHERE (project_name IN (SELECT name FROM projects WHERE ${projectCond}) OR company_id IN (${allowed.ids.join(',')}) OR warehouse IN ('غزة - المستودع الرئيسي', 'المخزن الرئيسي', 'مخزن الصيدليات والأدوية'))`;
            matClause = `AND project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const po = await pool.query(`SELECT SUM(qty * estimated_cost) as sum FROM purchase_orders WHERE is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${poClause}`, params);
        const inv = await pool.query(`SELECT SUM(remaining_qty * buy_price) as sum FROM inventory_items ${invClause ? invClause.replace('WHERE', 'WHERE is_deleted = FALSE AND') : 'WHERE is_deleted = FALSE'}`);
        const mat = await pool.query(`SELECT SUM(qty) as sum FROM material_usage WHERE is_deleted = FALSE ${proj ? "AND project_name = $1" : ""} ${matClause}`, params);

        res.json({
            totalPO: Number(po.rows[0]?.sum || 0), inventoryValue: Number(inv.rows[0]?.sum || 0),
            totalIssued: Number(mat.rows[0]?.sum || 0), totalReturned: 0, pendingRFQ: 0, activeSubs: 0, lowStock: 0, totalTransfers: 0
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/sub_variance', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "";
        if (allowed) {
            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            filterClause = `WHERE b.project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const q = `
            SELECT s.name as subcontractor_name, si.item_desc, si.assigned_qty, 
                   si.unit_price as sub_price, b.unit_price as original_boq_price, 
                   (b.unit_price - si.unit_price)*si.assigned_qty as variance_profit 
            FROM subcontractor_items si 
            JOIN subcontractors s ON si.subcontractor_id = s.id 
            JOIN boq b ON si.boq_id = b.id
            ${filterClause}
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/aging_payables', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "WHERE i.status = 'اعتماد مالي' AND i.is_deleted = FALSE";
        if (allowed) {
            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            filterClause += ` AND i.project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const q = `
            SELECT s.name as subcontractor_name, i.project_name, SUM(i.net_amount) as total_due, MIN(i.date) as oldest_invoice_date 
            FROM subcontractor_invoices i 
            JOIN subcontractors s ON i.subcontractor_id = s.id 
            ${filterClause} AND i.net_amount > COALESCE((SELECT SUM(amount) FROM payment_receipts WHERE received_from = s.name AND type = 'Payment'), 0) 
            GROUP BY s.name, i.project_name 
            ORDER BY total_due DESC
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/boq_tracking', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "";
        if (allowed) {
            const projectCond = `(company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
            filterClause = `WHERE b.project_name IN (SELECT name FROM projects WHERE ${projectCond})`;
        }

        const q = `
            SELECT b.project_name, b.item_desc, b.unit, b.est_qty, 
                   COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0) AS assigned_qty, 
                   (b.est_qty - COALESCE((SELECT SUM(assigned_qty) FROM subcontractor_items WHERE boq_id = b.id), 0)) AS unassigned_qty, 
                   COALESCE((SELECT SUM(curr_qty) FROM subcontractor_invoices WHERE sub_item_id IN (SELECT id FROM subcontractor_items WHERE boq_id = b.id) AND status='اعتماد مالي' AND is_deleted = FALSE), 0) AS act_qty 
            FROM boq b
            ${filterClause}
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/project_profitability', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "WHERE p.is_deleted = FALSE";
        if (allowed) {
            filterClause += ` AND (p.company_id IN (${allowed.ids.join(',')}) OR p.company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
        }

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
            ${filterClause}
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
    } catch (e) {
        console.error("Project Profitability Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/realestate_absorption', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "WHERE p.is_deleted = FALSE";
        if (allowed) {
            filterClause += ` AND p.name IN (SELECT name FROM projects WHERE company_id IN (${allowed.ids.join(',')}) OR company IN (${allowed.names.map(n => `'${n}'`).join(',')}))`;
        }

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
            ${filterClause}
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
    } catch (e) {
        console.error("Real Estate Absorption Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/payroll_efficiency', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "WHERE status = 'Active' AND is_deleted = FALSE";
        if (allowed) {
            filterClause += ` AND company IN (${allowed.names.map(n => `'${n}'`).join(',')})`;
        }

        const q = `
            SELECT 
                department,
                COUNT(*) as head_count,
                SUM(COALESCE(salary, 0)) as total_basic,
                0 as total_incentives,
                SUM(COALESCE(salary, 0)) as total_commitment
            FROM staff
            ${filterClause}
            GROUP BY department
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch (e) {
        console.error("Payroll Efficiency Error:", e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/trial_balance', async (req, res) => {
    try {
        const allowed = resolveAllowedCompanies(req);
        let filterClause = "AND l.is_deleted = FALSE";
        if (allowed) {
            filterClause += ` AND l.company_id IN (${allowed.ids.join(',')})`;
        }

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
            LEFT JOIN ledger l ON l.account_name = coa.account_name ${filterClause}
            WHERE coa.is_deleted = FALSE
            GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
            ORDER BY coa.account_code ASC
        `;
        const result = await pool.query(q);
        res.json({ data: result.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;