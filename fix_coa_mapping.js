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
        console.log("🛠️  Mapping Payroll Accounts...");
        
        // Ensure Salary Expense is type 'Expense'
        await pool.query(`
            INSERT INTO chart_of_accounts (account_name, account_type, account_code, manual_entry_allowed) 
            VALUES ('مصاريف رواتب وأجور', 'Expense', '5001', true) 
            ON CONFLICT (account_name) DO UPDATE SET account_type = 'Expense'
        `);

        // Ensure Advances is type 'Asset'
        await pool.query(`
            INSERT INTO chart_of_accounts (account_name, account_type, account_code, manual_entry_allowed) 
            VALUES ('سلف العاملين / ذمم موظفين', 'Asset', '1005', true) 
            ON CONFLICT (account_name) DO UPDATE SET account_type = 'Asset'
        `);

        console.log("✅ Accounts mapped successfully!");
    } catch (e) {
        console.error("❌ Error mapping accounts:", e);
    } finally {
        await pool.end();
    }
}

fix();
