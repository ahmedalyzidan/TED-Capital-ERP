const pool = require('./backend/config/db');

async function check() {
    try {
        for (const tableName of ['tasks', 'currency_rates', 'partners']) {
            const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [tableName]);
            console.log(`${tableName} Columns:`, cols.rows.map(c => c.column_name));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
