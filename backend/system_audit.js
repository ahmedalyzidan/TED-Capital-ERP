const pool = require('./config/db');
const AccountingService = require('./services/accountingService');

async function runAudit() {
    console.log("🚀 STARTING FULL SYSTEM AUDIT & STRESS TEST...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = 'AuditAgent';

        // 1. Get Master Builder Company ID
        const compRes = await client.query("SELECT id FROM companies WHERE name = 'MASTER BUILDER'");
        const companyId = compRes.rows[0].id;

        // 2. Setup Project
        const projectName = 'Audit Test Project 2026';
        await client.query("DELETE FROM projects WHERE name = $1", [projectName]);
        const projRes = await client.query(
            "INSERT INTO projects (name, company_id, budget, status) VALUES ($1, $2, 1000000, 'Active') RETURNING id",
            [projectName, companyId]
        );
        const projectId = projRes.rows[0].id;
        console.log("✅ Project Created:", projectName);

        // 3. Setup Customer
        const customerName = 'Global Corp Audit';
        await client.query("DELETE FROM customers WHERE name = $1", [customerName]);
        const custRes = await client.query(
            "INSERT INTO customers (name, company_name) VALUES ($1, 'MASTER BUILDER') RETURNING id",
            [customerName]
        );
        const clientId = custRes.rows[0]?.id || 1;

        // 4. Setup Inventory
        const itemName = 'Audit Grade Steel';
        await client.query("DELETE FROM inventory_items WHERE item_name = $1", [itemName]);
        const invRes = await client.query(
            "INSERT INTO inventory_items (item_name, quantity, remaining_qty, buy_price, avg_cost, project_name, company_id) VALUES ($1, 1000, 1000, 50, 50, $2, $3) RETURNING id",
            [itemName, projectName, companyId]
        );
        const invId = invRes.rows[0].id;
        console.log("✅ Inventory Added:", itemName);

        // 5. Simulate Sale with Taxes (14% VAT, 1% WHT)
        const qty = 100;
        const price = 150;
        const subtotal = qty * price;
        const vat = subtotal * 0.14;
        const wht = subtotal * 0.01;
        const total = subtotal + vat - wht;

        console.log(`Processing Sale: Qty=${qty}, Price=${price}, Net=${subtotal}, VAT=${vat}, WHT=${wht}, Total=${total}`);

        // A. Cost of Goods Sold (COGS)
        const totalCost = qty * 50;
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '5100', creditAccount: '1130', amount: totalCost, costCenter: projectName,
            description: `Audit: COGS for ${itemName}`, username, companyId
        });

        // B. Revenue & Taxes
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1120', creditAccount: '4100', amount: subtotal, costCenter: projectName,
            description: `Audit: Base Revenue`, username, companyId
        });
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1120', creditAccount: '2150', amount: vat, costCenter: projectName,
            description: `Audit: VAT 14%`, username, companyId
        });
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1150', creditAccount: '1120', amount: wht, costCenter: projectName,
            description: `Audit: WHT Receivable`, username, companyId
        });

        console.log("✅ Accounting Entries Posted Successfully");

        // 6. Verify Ledger Balance
        const ledgerRes = await client.query("SELECT SUM(debit) as d, SUM(credit) as c FROM ledger WHERE cost_center = $1", [projectName]);
        const { d, c } = ledgerRes.rows[0];
        if (Math.abs(d - c) > 0.01) {
            throw new Error(`CRITICAL: Ledger Imbalance Detected! Debit: ${d}, Credit: ${c}`);
        }
        console.log(`✅ Ledger Balanced: ${d} == ${c}`);

        // 7. Verify P&L
        const pnlRes = await client.query(`
            SELECT 
                SUM(CASE WHEN c.account_type = 'Revenue' THEN (l.credit - l.debit) ELSE 0 END) as rev,
                SUM(CASE WHEN c.account_type = 'Expense' THEN (l.debit - l.credit) ELSE 0 END) as exp
            FROM ledger l 
            JOIN chart_of_accounts c ON l.account_name = c.account_name
            WHERE l.cost_center = $1
        `, [projectName]);
        const { rev, exp } = pnlRes.rows[0];
        const profit = Number(rev) - Number(exp);
        console.log(`✅ P&L Check: Revenue=${rev}, Expense=${exp}, Net Profit=${profit}`);
        if (profit !== (subtotal - totalCost)) {
             throw new Error(`CRITICAL: Profit Calculation Mismatch! Expected: ${subtotal - totalCost}, Actual: ${profit}`);
        }

        await client.query('COMMIT');
        console.log("🌟 AUDIT COMPLETED SUCCESSFULLY. SYSTEM IS STABLE.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ AUDIT FAILED:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}

runAudit();
