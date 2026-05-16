const pool = require('./config/db');
async function testInv() {
    try {
        const res = await pool.query(`SELECT SUM(quantity * buy_price) as total FROM inventory_items`);
        console.log("Inventory Valuation Total:", res.rows[0].total);
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testInv();
