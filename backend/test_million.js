const pool = require('./config/db');
async function findMillion() {
    try {
        const res = await pool.query(`SELECT * FROM ledger WHERE (account_name LIKE '%عملاء%' OR account_name LIKE '%AR%') AND (credit >= 1000000 OR debit >= 1000000)`);
        console.log("Million Entries:", JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(); }
}
findMillion();
