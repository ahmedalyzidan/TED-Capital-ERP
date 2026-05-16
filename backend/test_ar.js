const pool = require('./config/db');
async function testAR() {
    try {
        const res = await pool.query(`
            SELECT coa.account_name, coa.account_code, 
                   SUM(l.debit) as total_debit, 
                   SUM(l.credit) as total_credit, 
                   SUM(l.debit - l.credit) as balance 
            FROM chart_of_accounts coa 
            JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name) 
            WHERE coa.account_code LIKE '112%' 
            GROUP BY coa.account_name, coa.account_code
        `);
        console.log("AR Result:", JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query(`
            SELECT coa.account_name, coa.account_code, 
                   SUM(l.credit - l.debit) as balance 
            FROM chart_of_accounts coa 
            JOIN ledger l ON TRIM(coa.account_name) = TRIM(l.account_name) 
            WHERE coa.account_code LIKE '211%' 
            GROUP BY coa.account_name, coa.account_code
        `);
        console.log("AP Result:", JSON.stringify(res2.rows, null, 2));
    } catch (e) { console.error(e); } finally { process.exit(); }
}
testAR();
