const pool = require('./config/db');
async function checkCOA() {
    try {
        const res = await pool.query("SELECT account_code, account_name, hierarchy_level FROM chart_of_accounts WHERE account_code LIKE '211%' OR account_code LIKE '110%' OR account_code LIKE '111%' OR account_code LIKE '113%' LIMIT 20");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkCOA();
