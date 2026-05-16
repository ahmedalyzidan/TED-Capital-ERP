const pool = require('./config/db');
const AccountingService = require('./services/accountingService');

async function auditHR() {
    console.log("👥 AUDITING HR & PAYROLL MODULE...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = 'AuditAgent';
        
        // 1. Get DESIGN CONCEPT ID
        const compRes = await client.query("SELECT id FROM companies WHERE name = 'DESIGN CONCEPT'");
        const companyId = compRes.rows[0].id;

        // 2. Setup Staff
        const staffName = 'Ahmed Auditor';
        await client.query("DELETE FROM staff WHERE name = $1", [staffName]);
        const staffRes = await client.query(
            "INSERT INTO staff (name, company_id, salary, status) VALUES ($1, $2, 15000, 'Active') RETURNING id",
            [staffName, companyId]
        );
        const staffId = staffRes.rows[0].id;
        console.log("✅ Staff Created:", staffName);

        // 3. Simulate Salary Advance (Solfah)
        const advanceAmount = 2000;
        console.log(`Processing Salary Advance: Amount=${advanceAmount}`);
        
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1140', // دفعات مقدمة (Solfah)
            creditAccount: '1101', // Cash
            amount: advanceAmount,
            costCenter: 'General Administration',
            description: `Audit: Salary Advance for ${staffName}`,
            username,
            companyId
        });

        // 4. Simulate Monthly Payroll Process
        const netSalary = 15000 - advanceAmount;
        console.log(`Processing Payroll: Basic=15000, Deduction=${advanceAmount}, Net=${netSalary}`);

        // A. Full Salary Expense
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '6100', // رواتب الإدارة
            creditAccount: '1101', // Cash Payment
            amount: netSalary,
            costCenter: 'General Administration',
            description: `Audit: Monthly Salary for ${staffName}`,
            username,
            companyId
        });

        // B. Settle Advance
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '6100', // Expense
            creditAccount: '1140', // Settle Advance
            amount: advanceAmount,
            costCenter: 'General Administration',
            description: `Audit: Advance Settlement for ${staffName}`,
            username,
            companyId
        });

        // 5. Verify HR Accounting Integrity
        const expRes = await client.query(`
            SELECT SUM(debit) as total_expense 
            FROM ledger 
            WHERE account_name = (SELECT account_name FROM chart_of_accounts WHERE account_code = '6100')
            AND description LIKE '%${staffName}%'
        `);
        const totalExp = Number(expRes.rows[0].total_expense);
        console.log(`✅ HR Expense Check: Total Salary Expense=${totalExp}`);
        
        if (totalExp !== 15000) {
            throw new Error(`CRITICAL: HR Expense Mismatch! Expected 15000, Got ${totalExp}`);
        }

        await client.query('COMMIT');
        console.log("🌟 HR & PAYROLL MODULE AUDIT PASSED.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ HR AUDIT FAILED:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}

auditHR();
