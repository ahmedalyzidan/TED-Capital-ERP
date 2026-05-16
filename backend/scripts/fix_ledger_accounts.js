const pool = require('../config/db');

async function fixLedgerAccounts() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("🚀 Starting Comprehensive Ledger & Projects Entity Alignment...");

        // Temporarily disable ledger integrity trigger for administrative migration
        console.log("🔓 Temporarily disabling ledger integrity triggers for structural alignment...");
        await client.query('ALTER TABLE ledger DISABLE TRIGGER ALL');

        // 1. Standardize projects table
        console.log("📦 Standardizing projects table company mappings...");
        await client.query(`UPDATE projects SET company = 'Master Builder', company_id = 3 WHERE id IN (5, 6, 11) OR name IN ('USG', 'Sub Audit Proj 2026', 'Audit Test Project 2026')`);
        await client.query(`UPDATE projects SET company = 'TED Capital', company_id = 1 WHERE id IN (1, 3, 8, 9, 10, 13) OR name IN ('Abdullah Zidan', 'Abdullah Zidan1', 'Capital Tower Audit', 'TTTTT', 'ttt', 'USGيي')`);
        
        // 2. Synchronize ledger company metadata from projects table
        console.log("🔄 Synchronizing ledger company metadata from projects...");
        await client.query(`
            UPDATE ledger l 
            SET company = p.company, company_id = p.company_id 
            FROM projects p 
            WHERE (l.cost_center = p.name OR l.cost_center = p.id::text)
            AND p.company_id IS NOT NULL
        `);

        // 3. Fallback for unmapped ledger rows
        console.log("🔍 Applying fallbacks for remaining unmapped ledger rows...");
        await client.query(`UPDATE ledger SET company = 'Master Builder', company_id = 3 WHERE company_id IS NULL AND description ILIKE '%(Master Builder)%'`);
        await client.query(`UPDATE ledger SET company = 'Design Concept', company_id = 2 WHERE company_id IS NULL AND description ILIKE '%(Design Concept)%'`);
        await client.query(`UPDATE ledger SET company = 'TED Capital', company_id = 1 WHERE company_id IS NULL`);

        // 4. Crown Jewel: Aligning account names in ledger based on company_id
        console.log("💎 Executing Crown Jewel Account Name Alignment in Ledger...");
        
        // Master Builder (company_id: 3)
        const mbCashRes = await client.query(`
            UPDATE ledger 
            SET account_name = 'صندوق نقدية - ماستر بيلدر' 
            WHERE company_id = 3 
            AND account_name IN ('صندوق نقدية - تيد كابيتال', 'صندوق نقدية - ديزاين كونسبت', 'الأصول المتداولة')
            RETURNING id
        `);
        console.log(`✅ Master Builder Cash alignment updated ${mbCashRes.rows.length} rows.`);

        const mbBankRes = await client.query(`
            UPDATE ledger 
            SET account_name = 'بنك - ماستر بيلدر' 
            WHERE company_id = 3 
            AND (account_name ILIKE '%بنك CIB%' OR account_name ILIKE '%بنك الأهلي%')
            RETURNING id
        `);
        console.log(`✅ Master Builder Bank alignment updated ${mbBankRes.rows.length} rows.`);

        // Design Concept (company_id: 2)
        const dcCashRes = await client.query(`
            UPDATE ledger 
            SET account_name = 'صندوق نقدية - ديزاين كونسبت' 
            WHERE company_id = 2 
            AND account_name IN ('صندوق نقدية - تيد كابيتال', 'صندوق نقدية - ماستر بيلدر', 'الأصول المتداولة')
            RETURNING id
        `);
        console.log(`✅ Design Concept Cash alignment updated ${dcCashRes.rows.length} rows.`);

        const dcBankRes = await client.query(`
            UPDATE ledger 
            SET account_name = 'بنك الأهلي - ديزاين كونسبت' 
            WHERE company_id = 2 
            AND (account_name ILIKE '%بنك CIB%' OR account_name ILIKE '%بنك - ماستر بيلدر%')
            RETURNING id
        `);
        console.log(`✅ Design Concept Bank alignment updated ${dcBankRes.rows.length} rows.`);

        // TED Capital (company_id: 1)
        const tcCashRes = await client.query(`
            UPDATE ledger 
            SET account_name = 'صندوق نقدية - تيد كابيتال' 
            WHERE company_id = 1 
            AND account_name = 'الأصول المتداولة'
            RETURNING id
        `);
        console.log(`✅ TED Capital Cash alignment updated ${tcCashRes.rows.length} rows.`);

        // Re-enable triggers before committing
        console.log("🔒 Re-enabling ledger integrity triggers...");
        await client.query('ALTER TABLE ledger ENABLE TRIGGER ALL');

        await client.query('COMMIT');
        console.log("🎉 Ledger entity alignment completed successfully!");

        // 5. Verification: Output updated Chart of Accounts balances
        console.log("\n📊 Final Chart of Accounts Cash & Bank Balances:");
        const coaRes = await client.query(`
            SELECT c.account_code, c.account_name, c.company_entity,
                COALESCE(
                    (SELECT SUM(
                        CASE 
                            WHEN sub.account_type IN ('Asset', 'Expense') THEN (l.debit - l.credit)
                            ELSE (l.credit - l.debit)
                        END
                    ) 
                    FROM ledger l 
                    JOIN chart_of_accounts sub ON l.account_name = sub.account_name
                    WHERE CAST(sub.account_code AS TEXT) LIKE (RTRIM(CAST(c.account_code AS TEXT), '0') || '%')
                    ), 
                0) AS balance 
            FROM chart_of_accounts c
            WHERE c.account_code LIKE '110%' OR c.account_code LIKE '111%'
            ORDER BY c.account_code ASC
        `);
        console.table(coaRes.rows);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("🔥 Error during ledger alignment:", err);
        try {
            // Ensure triggers are re-enabled even on failure
            await client.query('ALTER TABLE ledger ENABLE TRIGGER ALL');
            console.log("🔒 Triggers re-enabled after rollback.");
        } catch (triggerErr) {
            console.error("🔥 Error re-enabling triggers:", triggerErr);
        }
    } finally {
        client.release();
        pool.end();
    }
}

fixLedgerAccounts();
