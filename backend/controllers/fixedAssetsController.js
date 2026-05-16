const pool = require('../config/db');
const { autoLedgerEntry, logAdvancedAudit } = require('../utils/helpers');

/**
 * Fixed Assets Controller
 * Manages asset lifecycle with strict financial integrity
 */

const registerAsset = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { name, category_id, purchase_date, purchase_cost, scrap_value, location_id, asset_code } = req.body;

        // 1. Validation (Bank-Grade)
        if (!name || !purchase_cost || purchase_cost <= 0) {
            throw new Error("بيانات غير صالحة: يجب إدخال اسم الأصل وقيمة شراء موجبة.");
        }

        // 2. Insert Asset
        const result = await client.query(
            `INSERT INTO fixed_assets (name, category_id, purchase_date, purchase_cost, scrap_value, current_book_value, location_id, asset_code)
             VALUES ($1, $2, $3, $4, $5, $4, $6, $7) RETURNING *`,
            [name, category_id, purchase_date, purchase_cost, scrap_value || 0, location_id, asset_code]
        );

        const newAsset = result.rows[0];

        // 3. Audit Log
        await logAdvancedAudit(client, req.user.username, 'fixed_assets', newAsset.id, 'CREATE', 'Registration of new fixed asset', null, newAsset);

        await client.query('COMMIT');
        res.json({ success: true, asset: newAsset });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const runDepreciation = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { period } = req.body; // e.g. "05-2026"

        // Get all active assets and their categories
        const assets = await client.query(`
            SELECT a.*, c.useful_life_months, c.dep_expense_account_id, c.accum_dep_account_id 
            FROM fixed_assets a
            JOIN asset_categories c ON a.category_id = c.id
            WHERE a.status = 'Active' AND a.is_deleted = FALSE
        `);

        for (const asset of assets.rows) {
            // 1. Check for duplicate depreciation in this period
            const duplicateCheck = await client.query(
                "SELECT id FROM asset_depreciation_logs WHERE asset_id = $1 AND period = $2",
                [asset.id, period]
            );
            if (duplicateCheck.rows.length > 0) continue;

            // 2. Calculation
            const monthlyDep = Number(((Number(asset.purchase_cost) - Number(asset.scrap_value)) / Number(asset.useful_life_months)).toFixed(2));
            
            // 3. Stop if book value reached scrap value
            if (Number(asset.current_book_value) <= Number(asset.scrap_value)) continue;

            // 4. Generate GL Entry and get ID
            const journalId = await autoLedgerEntry(
                client, 
                asset.dep_expense_account_id, 
                asset.accum_dep_account_id, 
                monthlyDep, 
                null, 
                `إهلاك أصل: ${asset.name} - فترة: ${period}`, 
                req.user.username
            );

            // 5. Update Asset Value
            await client.query(
                "UPDATE fixed_assets SET current_book_value = current_book_value - $1 WHERE id = $2",
                [monthlyDep, asset.id]
            );

            // 6. Log Depreciation with Journal Link
            await client.query(
                "INSERT INTO asset_depreciation_logs (asset_id, period, amount, journal_entry_id) VALUES ($1, $2, $3, $4)",
                [asset.id, period, monthlyDep, journalId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Depreciation processed for ${assets.rows.length} assets.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = { registerAsset, runDepreciation };
