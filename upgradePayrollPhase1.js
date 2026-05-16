// upgradePayrollPhase1.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'erp_db',
    password: process.env.DB_PASS || '1985',
    port: process.env.DB_PORT || 5432,
});

async function upgrade() {
    console.log("🚀 Upgrading HR & Payroll Schema...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update Staff Table
        console.log("Updating staff table...");
        const staffAlters = [
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS job_title VARCHAR(100)`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS department VARCHAR(100)`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS id_number VARCHAR(50)`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(50)`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100)`,
            `ALTER TABLE staff ADD COLUMN IF NOT EXISTS iban VARCHAR(100)`
        ];
        for (let q of staffAlters) await client.query(q);

        // 2. Update Payroll Table
        console.log("Updating payroll table...");
        const payrollAlters = [
            `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC DEFAULT 0`,
            `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS insurance_deduction NUMERIC DEFAULT 0`,
            `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS other_additions NUMERIC DEFAULT 0`,
            `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS gross_salary NUMERIC DEFAULT 0`,
            `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft'`
        ];
        for (let q of payrollAlters) await client.query(q);

        await client.query('COMMIT');
        console.log("✅ Upgrade Phase 1 Completed.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Upgrade Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

upgrade();
