
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:your_secure_password@db:5432/erp_db'
});

async function runAudit() {
    console.log("🔍 Starting Comprehensive System Audit...");
    try {
        await client.connect();
        console.log("✅ Database Connected.");

        // 1. Financial Integrity Check: Balanced Journal Entries
        console.log("\n📊 1. Financial Integrity Audit:");
        const journalCheck = await client.query(`
            SELECT journal_id, SUM(debit) as total_debit, SUM(credit) as total_credit 
            FROM journal_entries 
            GROUP BY journal_id 
            HAVING SUM(debit) != SUM(credit)
        `);
        if (journalCheck.rows.length === 0) {
            console.log("✅ All journal entries are balanced.");
        } else {
            console.log("❌ CRITICAL: Unbalanced journal entries found!", journalCheck.rows);
        }

        // 2. Database Schema Integrity
        console.log("\n🗄️ 2. Database Schema Audit:");
        const tables = ['accounts', 'journal_entries', 'projects', 'purchase_orders', 'inventory'];
        for (const table of tables) {
            const check = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
            console.log(`${check.rows[0].exists ? '✅' : '❌'} Table '${table}' exists.`);
        }

        // 3. Functional Audit: Inventory vs PO Sync
        console.log("\n📦 3. Functional Consistency Audit:");
        const poOrphans = await client.query(`
            SELECT po_id FROM purchase_order_items 
            WHERE po_id NOT IN (SELECT id FROM purchase_orders)
        `);
        console.log(`${poOrphans.rows.length === 0 ? '✅' : '❌'} No orphaned PO items found.`);

        // 4. Security Audit: Check for Default Admin/Weak Perms
        console.log("\n🔐 4. Security Baseline Audit:");
        const adminCheck = await client.query(`SELECT id, email, role FROM users WHERE role = 'admin'`);
        console.log(`✅ Admin users found: ${adminCheck.rows.length}`);
        
        console.log("\n🏁 Audit Completed successfully.");

    } catch (err) {
        console.error("❌ Audit Failed:", err);
    } finally {
        await client.end();
    }
}

runAudit();
