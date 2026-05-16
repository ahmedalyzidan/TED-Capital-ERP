require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        await pool.query('ALTER TABLE staff_advances ADD COLUMN IF NOT EXISTS repayment_method VARCHAR(100)');
        console.log('✅ Added repayment_method to staff_advances');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
