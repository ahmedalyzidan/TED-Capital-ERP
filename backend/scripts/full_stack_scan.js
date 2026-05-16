const pool = require('../config/db');

async function scan() {
    console.log("🔍 STARTING FULL STACK PRODUCTION SCAN...");
    
    const results = {
        infrastructure: {},
        database: {},
        logic: {}
    };

    try {
        // 1. Database Connectivity
        const dbCheck = await pool.query('SELECT NOW()');
        results.database.connected = !!dbCheck.rows[0];
        console.log("✅ Database Connected.");

        // 2. Table Presence Check
        const coreTables = [
            'users', 'roles', 'chart_of_accounts', 'ledger', 'journal_entries', 
            'gl_mappings', 'customers', 'projects', 'subcontractors', 'inventory_items', 'purchase_orders'
        ];
        results.database.tables = {};
        for (const table of coreTables) {
            const res = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [table]);
            results.database.tables[table] = res.rows.length > 0;
            if (!results.database.tables[table]) console.warn(`⚠️ Table Missing: ${table}`);
        }
        console.log("✅ Core Tables Verified.");

        // 3. Essential Seed Data Check
        const adminCheck = await pool.query(`SELECT id FROM users WHERE username = 'admin' AND status = 'Active'`);
        results.logic.admin_ready = adminCheck.rows.length > 0;
        
        const coaCount = await pool.query(`SELECT COUNT(*) FROM chart_of_accounts`);
        results.logic.coa_count = parseInt(coaCount.rows[0].count);
        
        const mappingCount = await pool.query(`SELECT COUNT(*) FROM gl_mappings`);
        results.logic.mappings_ready = parseInt(mappingCount.rows[0].count);

        console.log(`✅ System State: Admin=${results.logic.admin_ready}, COA=${results.logic.coa_count}, Mappings=${results.logic.mappings_ready}`);

        // 4. Schema Integrity (Specific Fixes Verification)
        const poCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'currency'`);
        results.database.po_schema_ok = poCols.rows.length > 0;
        console.log(`✅ Purchase Order Schema: ${results.database.po_schema_ok ? 'OK' : 'FAIL'}`);

        console.log("\n📊 FINAL SCAN REPORT:");
        console.log(JSON.stringify(results, null, 2));

        if (Object.values(results.database.tables).every(t => t) && results.logic.admin_ready && results.database.po_schema_ok) {
            console.log("\n🌟 [SUCCESS] Production environment is working properly.");
        } else {
            console.log("\n❌ [DEGRADED] Issues detected in production scan.");
        }

    } catch (error) {
        console.error("🔥 SCAN FAILED:", error.message);
    } finally {
        process.exit();
    }
}

scan();
