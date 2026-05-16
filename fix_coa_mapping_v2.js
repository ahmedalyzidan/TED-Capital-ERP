require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fix() {
    try {
        console.log("🛠️  Updating Account Mappings...");
        
        // 1. Try to update Salary Expense
        const up1 = await pool.query("UPDATE chart_of_accounts SET account_type = 'Expense' WHERE account_name = 'مصاريف رواتب وأجور'");
        if (up1.rowCount === 0) {
            await pool.query("INSERT INTO chart_of_accounts (account_name, account_type, account_code, manual_entry_allowed) VALUES ('مصاريف رواتب وأجور', 'Expense', '5001', true)");
            console.log("➕ Created Salary Expense account");
        } else {
            console.log("✅ Updated Salary Expense account");
        }

        // 2. Try to update Advances
        const up2 = await pool.query("UPDATE chart_of_accounts SET account_type = 'Asset' WHERE account_name = 'سلف العاملين / ذمم موظفين'");
        if (up2.rowCount === 0) {
            await pool.query("INSERT INTO chart_of_accounts (account_name, account_type, account_code, manual_entry_allowed) VALUES ('سلف العاملين / ذمم موظفين', 'Asset', '1005', true)");
            console.log("➕ Created Advances account");
        } else {
            console.log("✅ Updated Advances account");
        }

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await pool.end();
    }
}

fix();
