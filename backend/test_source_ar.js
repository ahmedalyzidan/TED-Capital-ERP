const pool = require('./config/db');
async function testSourceAR() {
    try {
        const res = await pool.query(`
            SELECT 
                SUM(
                    COALESCE((SELECT SUM(qty * sell_price) FROM inventory_sales WHERE client_id = c.id OR customer_name = c.name), 0) -
                    COALESCE((SELECT SUM(amount_paid) FROM client_payment_history WHERE client_id = c.id), 0)
                ) as total_ar
            FROM customers c
        `);
        console.log("Source AR Total:", res.rows[0].total_ar);
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testSourceAR();
