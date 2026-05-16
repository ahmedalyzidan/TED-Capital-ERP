const pool = require('../config/db');
const notificationService = require('./notificationService');

class IntelligenceEngine {
    /**
     * Run all intelligent diagnostic checks
     */
    async runDiagnostics() {
        console.log('🧠 Intelligence Engine: Running global diagnostics...');
        try {
            // Fetch central settings
            const settingsRes = await pool.query('SELECT * FROM settings LIMIT 1');
            const settings = settingsRes.rows[0];

            if (!settings || !settings.intelligence_enabled) {
                console.log('🚫 Intelligence Engine is disabled in settings.');
                return;
            }

            await this.checkLiquidityRisk(settings);
            await this.checkBudgetThresholds(settings);
            await this.checkApprovalBottlenecks(settings);
            await this.checkHighValuePOs(settings);
            await this.checkInactiveClients(settings);
            await this.checkVendorConcentration(settings);
            await this.checkInventoryThresholds(settings);
            console.log('✅ Intelligence Engine: Diagnostics complete.');
        } catch (err) {
            console.error('🔥 Intelligence Engine Error:', err.message);
        }
    }

    /**
     * 1. Financial Intelligence: Predict Liquidity Gaps
     */
    async checkLiquidityRisk(settings) {
        // Sum from both legacy and new sales installment tables
        const inflowRes = await pool.query(`
            SELECT SUM(amount) as total FROM (
                SELECT amount FROM installments WHERE due_date <= CURRENT_DATE + INTERVAL '15 days' AND status != 'Paid' AND is_deleted = FALSE
                UNION ALL
                SELECT amount FROM sale_installments WHERE due_date <= CURRENT_DATE + INTERVAL '15 days' AND status != 'Paid' AND is_deleted = FALSE
            ) as combined_inflow
        `);
        
        const outflowRes = await pool.query(`
            SELECT SUM(total_amount) as total 
            FROM purchase_orders 
            WHERE status IN ('Approved', 'In Progress')
            AND is_deleted = FALSE
        `);

        const inflow = parseFloat(inflowRes.rows[0].total || 0);
        const outflow = parseFloat(outflowRes.rows[0].total || 0);
        const gap = outflow - inflow;

        if (gap > parseFloat(settings.liquidity_threshold || 500000)) {
            await notificationService.alertLiquidityRisk(gap, 15);
        }
    }

    /**
     * 2. Project Intelligence: Detect Budget Burn
     */
    async checkBudgetThresholds(settings) {
        const threshold = settings.budget_threshold_pct || 90;
        const projects = await pool.query(`
            SELECT p.id, p.name, p.budget, 
                   COALESCE(SUM(l.debit - l.credit), 0) as current_spend
            FROM projects p
            LEFT JOIN ledger l ON l.cost_center = p.name
            GROUP BY p.id, p.name, p.budget
            HAVING p.budget > 0
        `);

        for (const p of projects.rows) {
            const spend = parseFloat(p.current_spend);
            const budget = parseFloat(p.budget);
            const percent = (spend / budget) * 100;

            if (percent >= threshold) {
                await notificationService.alertBudgetThreshold(p.name, Math.round(percent), spend);
            }
        }
    }

    /**
     * 3. Operational Intelligence: Detect Bottlenecks
     */
    async checkApprovalBottlenecks(settings) {
        const slaHours = settings.approval_sla_hours || 48;
        const stuckApprovals = await pool.query(`
            SELECT wd.module_name, wi.record_id, wi.created_at 
            FROM workflow_instances wi
            JOIN workflow_definitions wd ON wi.definition_id = wd.id
            WHERE wi.status = 'Pending Authorization' 
            AND wi.created_at < NOW() - INTERVAL '${slaHours} hours'
        `);

        for (const auth of stuckApprovals.rows) {
            await notificationService.notify('Admin', 
                `⏳ Approval Bottleneck: ${auth.module_name}`,
                `The request for #${auth.record_id} has been pending for over ${slaHours} hours. Strategic attention required.`,
                { severity: 'critical', category: 'workflow', actionLink: '/approvals' }
            );
        }
    }

    /**
     * 4. Strategic: High-Value Purchase Orders
     */
    async checkHighValuePOs(settings) {
        const threshold = parseFloat(settings.high_value_po_threshold || 1000000);
        const recentPOs = await pool.query(`
            SELECT id, total_amount, supplier 
            FROM purchase_orders 
            WHERE created_at > NOW() - INTERVAL '24 hours' 
            AND total_amount >= $1
        `, [threshold]);

        for (const po of recentPOs.rows) {
            await notificationService.notify('Admin',
                `💎 High-Value Order: #${po.id}`,
                `A new order for ${parseFloat(po.total_amount).toLocaleString()} LCY has been placed with ${po.supplier}. Review suggested.`,
                { severity: 'warning', category: 'procurement' }
            );
        }
    }

    /**
     * 5. CRM: Inactive Key Clients
     */
    async checkInactiveClients(settings) {
        const days = settings.inactive_client_days || 30;
        const inactiveClients = await pool.query(`
            SELECT name, id FROM customers 
            WHERE id NOT IN (
                SELECT customer_id FROM contracts WHERE start_date > NOW() - INTERVAL '${days} days'
            )
            LIMIT 5
        `);

        for (const client of inactiveClients.rows) {
            await notificationService.notify('Admin',
                `🤝 Relationship Alert: ${client.name}`,
                `This client has shown no new contract activity for over ${days} days. Engagement required.`,
                { severity: 'info', category: 'crm' }
            );
        }
    }

    /**
     * 6. Risk: Vendor Concentration
     */
    async checkVendorConcentration(settings) {
        const threshold = settings.vendor_concentration_pct || 50;
        const concentration = await pool.query(`
            WITH monthly_spend AS (
                SELECT SUM(total_amount) as total FROM purchase_orders 
                WHERE created_at > NOW() - INTERVAL '30 days'
            )
            SELECT supplier, SUM(total_amount) as vendor_total,
                   (SUM(total_amount) / NULLIF((SELECT total FROM monthly_spend), 0)) * 100 as pct
            FROM purchase_orders
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY supplier
            HAVING (SUM(total_amount) / NULLIF((SELECT total FROM monthly_spend), 0)) * 100 >= $1
        `, [threshold]);

        for (const v of concentration.rows) {
            await notificationService.notify('Admin',
                `⚖️ Vendor Concentration Risk`,
                `${v.supplier} represents ${Math.round(v.pct)}% of this month's total spending. Dependency risk detected.`,
                { severity: 'strategic', category: 'procurement' }
            );
        }
    }

    /**
     * 7. Inventory: Dynamic Stock Shortage (%)
     */
    async checkInventoryThresholds(settings) {
        const thresholdPct = settings.inventory_threshold_pct || 20;
        const lowStock = await pool.query(`
            SELECT item_name, remaining_qty, max_stock_level, 
                   (remaining_qty / NULLIF(max_stock_level, 0)) * 100 as current_pct
            FROM inventory_items 
            WHERE max_stock_level > 0 
            AND (remaining_qty / max_stock_level) * 100 <= $1
        `, [thresholdPct]);

        for (const item of lowStock.rows) {
            await notificationService.notify('Admin',
                `📦 Inventory Shortage: ${item.item_name}`,
                `Stock level is now at ${Math.round(item.current_pct)}% of maximum capacity. Replenishment recommended.`,
                { severity: 'critical', category: 'procurement', actionLink: '/inventory' }
            );
        }
    }
}

module.exports = new IntelligenceEngine();
