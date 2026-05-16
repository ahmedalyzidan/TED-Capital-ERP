const pool = require('./config/db');
async function testSales() {
    try {
        const res = await pool.query(`SELECT SUM(qty * sell_price) as total FROM inventory_sales`);
        console.log("Inventory Sales Total:", res.rows[0].total);

        const res2 = await pool.query(`SELECT SUM(amount_paid) as total FROM client_payment_history`);
        console.log("Client Payments Total:", res2.rows[0].total);

        const res3 = await pool.query(`SELECT SUM(total_price) as total FROM real_estate_contracts`);
        console.log("RE Contracts Total:", res3.rows[0].total);
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testSales();
