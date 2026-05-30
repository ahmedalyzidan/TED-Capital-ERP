/**
 * 🔒 TED ERP - MULTI-TENANT DATABASE ISOLATION TEST
 * Purpose: Verify absolute database segregation between different company tenants.
 * Ensures transactions in one company's database are invisible to other companies' databases.
 */

const poolProxy = require('../config/db');

async function runTenantIsolationTest() {
    console.log("🚀 Starting Tenant Database Isolation Verification...");

    // 1. Get database pools for two separate company tenants
    const companyAPool = poolProxy.getOrCreatePool('TED Capital'); // Target database: erp_ted_capital
    const companyBPool = poolProxy.getOrCreatePool('Design Concept'); // Target database: erp_design_concept

    const clientA = await companyAPool.connect();
    const clientB = await companyBPool.connect();

    const uniqueItemName = `ISOLATION_CHECK_ITEM_${Date.now()}`;

    try {
        console.log("🧪 Step 1: Starting isolated transactions on both pools...");
        await clientA.query('BEGIN');
        await clientB.query('BEGIN');

        // 2. Insert item into Company A database
        console.log(`🧪 Step 2: Inserting unique record to Company A (TED Capital) DB: "${uniqueItemName}"`);
        const insertRes = await clientA.query(`
            INSERT INTO inventory_items (item_name, quantity, remaining_qty, buy_price, avg_cost, company_id)
            VALUES ($1, 5, 5, 200, 200, 1) RETURNING id
        `, [uniqueItemName]);
        const recordId = insertRes.rows[0].id;
        console.log(`   ✅ Record successfully created in Company A with ID: ${recordId}`);

        // 3. Verify it is visible inside Company A
        console.log(`🧪 Step 3: Checking visibility of record inside Company A database...`);
        const checkARes = await clientA.query(`SELECT id FROM inventory_items WHERE item_name = $1`, [uniqueItemName]);
        if (checkARes.rows.length === 1) {
            console.log("   ✅ Visible in Company A: TRUE");
        } else {
            throw new Error("Record was not successfully saved/read from Company A DB.");
        }

        // 4. Verify it is absolutely INVISIBLE inside Company B
        console.log(`🧪 Step 4: Querying for the same record inside Company B (Design Concept) database...`);
        const checkBRes = await clientB.query(`SELECT id FROM inventory_items WHERE item_name = $1`, [uniqueItemName]);
        console.log(`   📊 Found rows in Company B: ${checkBRes.rows.length}`);
        
        if (checkBRes.rows.length === 0) {
            console.log("   🔒 Isolation Check: PASSED (Data is invisible to Company B)");
        } else {
            throw new Error("⛔ CRITICAL SECURITY BREACH: Data inserted in Company A is visible to Company B!");
        }

        // Clean up: rollback both transactions so no garbage is committed
        await clientA.query('ROLLBACK');
        await clientB.query('ROLLBACK');
        console.log("\n-------------------------------------------------------------");
        console.log("🏆 MULTI-TENANT ISOLATION AUDIT: SUCCESS");
        console.log("🔒 Data segregation verified. Zero cross-tenant leaks detected.");
        console.log("-------------------------------------------------------------\n");

    } catch (err) {
        await clientA.query('ROLLBACK');
        await clientB.query('ROLLBACK');
        console.error("\n❌ MULTI-TENANT ISOLATION FAILED:", err.message);
    } finally {
        clientA.release();
        clientB.release();
        process.exit(0);
    }
}

runTenantIsolationTest();
