const pool = require('./config/db');
const AccountingService = require('./services/accountingService');

async function auditRealEstate() {
    console.log("🏢 AUDITING REAL ESTATE MODULE...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = 'AuditAgent';
        
        // 1. Get TED CAPITAL ID
        const compRes = await client.query("SELECT id FROM companies WHERE name = 'TED CAPITAL'");
        const companyId = compRes.rows[0].id;

        // 2. Setup Project & Unit
        const projectName = 'Capital Tower Audit';
        await client.query("DELETE FROM projects WHERE name = $1", [projectName]);
        await client.query("INSERT INTO projects (name, company_id, budget) VALUES ($1, $2, 5000000)", [projectName, companyId]);

        const unitCode = '101-Audit';
        await client.query("DELETE FROM property_units WHERE unit_number = $1", [unitCode]);
        const unitRes = await client.query(
            "INSERT INTO property_units (unit_number, project_name, status, price) VALUES ($1, $2, 'Available', 2000000) RETURNING id",
            [unitCode, projectName]
        );
        const unitId = unitRes.rows[0].id;
        console.log("✅ Property Unit Created:", unitCode);

        // 3. Setup Customer
        const customerName = 'Audit Tenant';
        await client.query("DELETE FROM customers WHERE name = $1", [customerName]);
        const custRes = await client.query("INSERT INTO customers (name, company_name) VALUES ($1, 'TED CAPITAL') RETURNING id", [customerName]);
        const customerId = custRes.rows[0].id;

        // 4. Create Contract
        const contractValue = 2000000;
        const downPayment = 500000;
        console.log(`Processing Real Estate Contract: Total=${contractValue}, Down Payment=${downPayment}`);

        // A. Booking/Contract Entry
        // Debit AR (1120) vs Credit Deferred Revenue (2130)
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1120', 
            creditAccount: '2130', 
            amount: contractValue,
            costCenter: projectName,
            description: `Audit: Contract Booking - Unit ${unitCode}`,
            username,
            companyId
        });

        // B. Down Payment Receipt
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1101', // Cash
            creditAccount: '1120', // Reduce AR
            amount: downPayment,
            costCenter: projectName,
            description: `Audit: Down Payment Receipt - Unit ${unitCode}`,
            username,
            companyId
        });

        // 5. Verify Real Estate Balances
        const arRes = await client.query(`
            SELECT SUM(debit - credit) as ar_balance 
            FROM ledger 
            WHERE account_name = (SELECT account_name FROM chart_of_accounts WHERE account_code = '1120')
            AND description LIKE '%${unitCode}%'
        `);
        const arBal = Number(arRes.rows[0].ar_balance);
        console.log(`✅ Real Estate AR Check: Remaining Balance=${arBal}`);
        
        if (arBal !== (contractValue - downPayment)) {
            throw new Error(`CRITICAL: Real Estate AR Mismatch! Expected ${contractValue - downPayment}, Got ${arBal}`);
        }

        await client.query('COMMIT');
        console.log("🌟 REAL ESTATE MODULE AUDIT PASSED.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ REAL ESTATE AUDIT FAILED:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}

auditRealEstate();
