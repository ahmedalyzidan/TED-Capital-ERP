const pool = require('../config/db');
const { centralPool } = require('../config/db');

async function clearSalesTable() {
    try {
        console.log("🚀 Starting cleanup of inventory_sales table across all active tenant DBs...");

        const compRes = await centralPool.query("SELECT name, db_name FROM companies WHERE is_active = TRUE");
        console.log(`Found ${compRes.rows.length} active tenant companies to process.`);

        for (const company of compRes.rows) {
            console.log(`\n🧹 Processing company database: "${company.name}" (${company.db_name})...`);
            const targetPool = pool.getOrCreatePool(company.name);

            await pool.tenantStorage.run(targetPool, async () => {
                try {
                    const tableCheck = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' AND table_name = 'inventory_sales'
                        )`
                    );
                    
                    if (tableCheck.rows[0].exists) {
                        console.log(`   - Truncating table: inventory_sales`);
                        await pool.query(`TRUNCATE TABLE inventory_sales RESTART IDENTITY CASCADE`);
                        console.log(`   ✅ Truncated successfully.`);
                    } else {
                        console.log(`   ℹ️ Table inventory_sales does not exist in this database.`);
                    }
                } catch (tableErr) {
                    console.warn(`   ⚠️ Warning processing table: ${tableErr.message}`);
                }
            });
        }
        console.log("\n✅ Finished clearing inventory_sales successfully!");
    } catch (err) {
        console.error("🔥 Error during database cleanup:", err.message);
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

clearSalesTable();
