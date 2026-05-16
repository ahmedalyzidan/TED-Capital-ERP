const pool = require('./config/db');
async function testRevenue() {
    try {
        const res = await pool.query(`
            SELECT coa.account_name, coa.account_code, 
                   SUM(l.credit - l.debit) as balance 
            FROM chart_of_accounts coa 
            JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name) 
            WHERE coa.account_code LIKE '41%' 
            GROUP BY coa.account_name, coa.account_code
        `);
        console.log("Revenue Result:", JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query(`
            SELECT account_name, SUM(debit) as d, SUM(credit) as c 
            FROM ledger 
            WHERE account_name LIKE '%مبيعات%'
            GROUP BY account_name
        `);
        console.log("Sales in Ledger:", JSON.stringify(res2.rows, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testRevenue();
