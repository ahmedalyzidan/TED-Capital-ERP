const pool = require('./backend/config/db');

async function check() {
    try {
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_orders'");
        console.log('Purchase Orders Columns:', JSON.stringify(cols.rows.map(c => c.column_name), null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
