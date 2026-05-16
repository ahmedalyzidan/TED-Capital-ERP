const pool = require('./config/db');
async function testLedgerLink() {
    try {
        const res = await pool.query(`SELECT account_name, description, client_id FROM ledger WHERE account_name LIKE '%عملاء%' LIMIT 5`);
        console.log("Ledger Samples:", JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testLedgerLink();
