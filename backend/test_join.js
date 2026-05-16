const pool = require('./config/db');
async function testJoin() {
    try {
        const res = await pool.query(`
            SELECT coa.account_name, coa.account_code, SUM(l.credit - l.debit) as balance 
            FROM chart_of_accounts coa 
            JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name) 
            WHERE coa.account_code LIKE '211%' 
            GROUP BY coa.account_name, coa.account_code
        `);
        console.log("AP Result:", JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query(`
            SELECT coa.account_name, coa.account_code, SUM(l.debit - l.credit) as balance 
            FROM chart_of_accounts coa 
            JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name) 
            WHERE (coa.account_code LIKE '110%' OR coa.account_code LIKE '111%')
            GROUP BY coa.account_name, coa.account_code
        `);
        console.log("Cash Result:", JSON.stringify(res2.rows, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testJoin();
