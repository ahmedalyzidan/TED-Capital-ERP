const pool = require('../config/db');
const { centralPool } = require('../config/db');

const transactionalTables = [
    'ledger', 'inventory_items', 'inventory_movements', 'inventory_sales',
    'inventory_transfers', 'inventory_bookings', 'inventory_audits',
    'material_usage', 'narcotics_custody_ledger', 'cold_chain_logs',
    'stock_disposal_protocols', 'pharma_shipments', 'staff', 'payroll',
    'staff_advances', 'attendance', 'purchase_orders', 'rfq',
    'subcontractor_invoices', 'boq', 'partner_deposits', 'partners',
    'projects', 'payment_receipts', 'installments', 'contracts',
    'client_consumptions', 'customers', 'tasks', 'daily_reports'
];

async function checkDatabaseData() {
    try {
        console.log("🔍 Auditing databases for existing transactional records...");
        
        const compRes = await centralPool.query("SELECT name, db_name FROM companies WHERE is_active = TRUE");
        console.log(`Found ${compRes.rows.length} active tenant databases to check.`);

        let totalRecordsFound = 0;

        for (const company of compRes.rows) {
            console.log(`\n🏢 Checking company: "${company.name}" (${company.db_name})...`);
            const targetPool = pool.getOrCreatePool(company.name);

            await pool.tenantStorage.run(targetPool, async () => {
                for (const table of transactionalTables) {
                    try {
                        const tableCheck = await pool.query(
                            `SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = 'public' AND table_name = $1
                            )`,
                            [table]
                        );
                        
                        if (tableCheck.rows[0].exists) {
                            const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
                            const count = parseInt(countRes.rows[0].count);
                            if (count > 0) {
                                console.log(`   🚨 Table [${table}] contains: ${count} records!`);
                                totalRecordsFound += count;
                            }
                        }
                    } catch (e) {
                        // ignore missing tables
                    }
                }
            });
        }

        console.log("\n=============================================");
        if (totalRecordsFound === 0) {
            console.log("✅ VERIFIED: All databases are completely empty of transactional data!");
        } else {
            console.log(`⚠️ ALERT: Found a total of ${totalRecordsFound} transactional records remaining in the database!`);
        }
        console.log("=============================================");

    } catch (err) {
        console.error("🔥 Audit Error:", err.message);
    } finally {
        try { await centralPool.end(); } catch (e) {}
        try {
            const { tenantPools } = require('../config/db');
            for (const key in tenantPools) {
                await tenantPools[key].end();
            }
        } catch (e) {}
        process.exit(0);
    }
}

checkDatabaseData();
