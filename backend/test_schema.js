const pool = require('./config/db');

async function test() {
    try {
        const res = await pool.query(`SELECT table_name, table_type FROM information_schema.tables WHERE table_name = 'inventory_sales'`);
        console.log("inventory_sales:", res.rows);
        const res2 = await pool.query(`SELECT view_definition FROM information_schema.views WHERE table_name = 'inventory_sales'`);
        console.log("view_def:", res2.rows);
    } catch (e) {
        console.error("SQL Error:", e.message);
    } finally {
        process.exit();
    }
}
test();
