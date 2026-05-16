require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'erp_db',
    password: process.env.DB_PASS || '1985',
    port: process.env.DB_PORT || 5432,
});

async function verify() {
    console.log("🔍 Verifying HR Tables...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Staff Advances Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS staff_advances (
                id SERIAL PRIMARY KEY,
                staff_id INT,
                amount NUMERIC,
                deduction_per_month NUMERIC,
                remaining_balance NUMERIC,
                status VARCHAR(50) DEFAULT 'Approved',
                request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ staff_advances table ready.");

        // 2. Sales Commissions Table (if missing)
        await client.query(`
            CREATE TABLE IF NOT EXISTS sales_commissions (
                id SERIAL PRIMARY KEY,
                staff_id INT,
                sale_id INT,
                amount NUMERIC,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ sales_commissions table ready.");

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Verification Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

verify();
