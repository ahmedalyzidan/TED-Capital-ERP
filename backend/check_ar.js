const pool = require('./config/db');
async function checkAR() {
    try {
        const res = await pool.query("SELECT account_code, account_name, hierarchy_level FROM chart_of_accounts WHERE account_code LIKE '112%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(); }
}
checkAR();
