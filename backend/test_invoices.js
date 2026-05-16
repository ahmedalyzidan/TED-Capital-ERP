const pool = require('./config/db');
async function testInvoices() {
    try {
        const res = await pool.query(`SELECT SUM(total_amount) as total FROM ar_invoices`);
        console.log("AR Invoices Total:", res.rows[0].total);

        const res2 = await pool.query(`SELECT SUM(total_revenue) as total FROM client_consumptions`);
        console.log("Client Consumptions Total:", res2.rows[0].total);
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testInvoices();
