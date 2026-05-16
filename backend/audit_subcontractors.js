const pool = require('./config/db');
const AccountingService = require('./services/accountingService');

async function auditSubcontractors() {
    console.log("👷 AUDITING SUBCONTRACTORS MODULE...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = 'AuditAgent';
        
        // 1. Get MASTER BUILDER ID
        const compRes = await client.query("SELECT id FROM companies WHERE name = 'MASTER BUILDER'");
        const companyId = compRes.rows[0].id;

        // 2. Setup Subcontractor
        const subName = 'Audit Subcontractor Ltd';
        await client.query("DELETE FROM subcontractors WHERE name = $1", [subName]);
        const subRes = await client.query(
            "INSERT INTO subcontractors (name, company_id) VALUES ($1, $2) RETURNING id",
            [subName, companyId]
        );
        const subId = subRes.rows[0].id;
        console.log("✅ Subcontractor Created:", subName);

        // 3. Create a Project for this Sub
        const projectName = 'Sub Audit Proj 2026';
        await client.query("DELETE FROM projects WHERE name = $1", [projectName]);
        await client.query("INSERT INTO projects (name, company_id, budget) VALUES ($1, $2, 500000)", [projectName, companyId]);

        // 4. Simulate Subcontractor Invoice (Moustakhalas)
        const invoiceAmount = 25000;
        console.log(`Processing Sub-Invoice: Amount=${invoiceAmount}`);

        // A. Project Expense (Cost Center) vs Subcontractor Payable
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '5200', // تكلفة مقاولي الباطن
            creditAccount: '2120', // مقاولي الباطن (حسابات دائنة)
            amount: invoiceAmount,
            costCenter: projectName,
            description: `Audit: Sub-Invoice for ${subName}`,
            username,
            companyId
        });

        // 5. Simulate Payment to Subcontractor
        const paymentAmount = 20000;
        console.log(`Processing Sub-Payment: Amount=${paymentAmount}`);

        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '2120', // Debit Subcontractor (Reduce Liability)
            creditAccount: '1101', // Credit Cash (Reduce Asset)
            amount: paymentAmount,
            costCenter: projectName,
            description: `Audit: Payment to ${subName}`,
            username,
            companyId
        });

        // 6. Verify Subcontractor Balance
        const subBalRes = await client.query(`
            SELECT 
                SUM(debit) as debits, 
                SUM(credit) as credits 
            FROM ledger 
            WHERE account_name = (SELECT account_name FROM chart_of_accounts WHERE account_code = '2120')
            AND description LIKE '%${subName}%'
        `);
        const { debits, credits } = subBalRes.rows[0];
        const balance = Number(credits) - Number(debits);
        console.log(`✅ Subcontractor Ledger Check: Credits=${credits}, Debits=${debits}, Remaining Payable=${balance}`);
        
        if (balance !== (invoiceAmount - paymentAmount)) {
            throw new Error(`CRITICAL: Subcontractor Balance Mismatch! Expected ${invoiceAmount - paymentAmount}, Got ${balance}`);
        }

        await client.query('COMMIT');
        console.log("🌟 SUBCONTRACTOR MODULE AUDIT PASSED.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ SUBCONTRACTOR AUDIT FAILED:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}

auditSubcontractors();
