const pool = require('../config/db');
const { logAudit, logAdvancedAudit } = require('../utils/helpers');

const transferStock = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { inventory_id, qty, to_warehouse, to_project, notes } = req.body;
        const username = req.user ? req.user.username : 'System';

        if (!inventory_id || !qty || !to_warehouse) throw new Error("Missing required fields for transfer.");

        // 1. Check Source
        const invRes = await client.query("SELECT * FROM inventory_items WHERE id = $1", [inventory_id]);
        if (invRes.rows.length === 0) throw new Error("Item not found.");
        const item = invRes.rows[0];

        if (parseFloat(item.remaining_qty) < parseFloat(qty)) throw new Error("Insufficient quantity available for transfer.");

        // 2. Deduct from Source
        await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2", [qty, inventory_id]);

        // 3. Create or Update Destination
        // We look for an item with same name, category, serial, batch in the target warehouse/project
        const destRes = await client.query(
            "SELECT id FROM inventory_items WHERE item_name = $1 AND warehouse = $2 AND project_name = $3 AND serial_no = $4 AND batch_no = $5",
            [item.item_name, to_warehouse, to_project || item.project_name, item.serial_no, item.batch_no]
        );

        if (destRes.rows.length > 0) {
            await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty + $1 WHERE id = $2", [qty, destRes.rows[0].id]);
        } else {
            await client.query(
                `INSERT INTO inventory_items (po_id, item_name, item_description, project_name, master_po_no, quantity, remaining_qty, buy_price, avg_cost, serial_no, batch_no, expiry_date, min_stock_level, category, uom, warehouse)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                [item.po_id, item.item_name, item.item_description, to_project || item.project_name, item.master_po_no, qty, qty, item.buy_price, item.avg_cost, item.serial_no, item.batch_no, item.expiry_date, item.min_stock_level, item.category, item.uom, to_warehouse]
            );
        }

        // 4. Log Movement
        await client.query(
            "INSERT INTO inventory_movements (inventory_id, movement_type, from_warehouse, to_warehouse, qty, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [inventory_id, 'Transfer', item.warehouse, to_warehouse, qty, notes, username]
        );

        await logAudit(username, 'STOCK_TRANSFER', 'inventory_items', inventory_id, `Transferred ${qty} to ${to_warehouse}`);
        await client.query('COMMIT');
        res.json({ success: true, message: "Stock transferred successfully." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
};

const reconcileAudit = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { audit_id, lines } = req.body;
        const username = req.user ? req.user.username : 'System';

        for (const line of lines) {
            const variance = parseFloat(line.physical_qty) - parseFloat(line.recorded_qty);
            
            // 1. Save Line Detail
            await client.query(
                "INSERT INTO inventory_audit_lines (audit_id, inventory_id, recorded_qty, physical_qty, variance) VALUES ($1, $2, $3, $4, $5)",
                [audit_id, line.inventory_id, line.recorded_qty, line.physical_qty, variance]
            );

            // 2. Adjust Inventory if there's a variance
            if (variance !== 0) {
                const invRes = await client.query("SELECT * FROM inventory_items WHERE id = $1", [line.inventory_id]);
                const oldItem = invRes.rows[0];

                await client.query(
                    "UPDATE inventory_items SET remaining_qty = $1 WHERE id = $2",
                    [line.physical_qty, line.inventory_id]
                );
                
                // 3. Log Adjustment Movement
                await client.query(
                    "INSERT INTO inventory_movements (inventory_id, movement_type, qty, notes, created_by) VALUES ($1, $2, $3, $4, $5)",
                    [line.inventory_id, variance > 0 ? 'Adjustment (Surplus)' : 'Adjustment (Deficit)', Math.abs(variance), `Audit Reconciliation #${audit_id}`, username]
                );

                // 4. Advanced Audit Logging for Deficit / Surplus
                const actionType = variance > 0 ? 'UPDATE' : 'REVERSAL'; // Treat deficit as reversal/loss for security tracking
                const details = variance > 0 ? `Inventory Surplus Adjustment of +${variance} for item #${line.inventory_id}` : `Inventory Deficit Adjustment of ${variance} for item #${line.inventory_id}`;
                await logAdvancedAudit(client, username, 'inventory_items', line.inventory_id, actionType, details, oldItem, { ...oldItem, remaining_qty: line.physical_qty });
            }
        }

        await client.query("UPDATE inventory_audits SET status = 'Completed' WHERE id = $1", [audit_id]);
        await logAudit(username, 'INVENTORY_AUDIT', 'inventory_audits', audit_id, `Completed Audit Reconciliation #${audit_id}`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "Audit reconciliation completed with full security tracking." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
};

const getInventoryIntelligence = async (req, res) => {
    try {
        const stats = {};

        // 1. Valuation by Project
        const valuationByProject = await pool.query(`
            SELECT 
                COALESCE(project_name, 'General') as name,
                SUM(remaining_qty * buy_price) as value
            FROM inventory_items
            WHERE remaining_qty > 0
            GROUP BY project_name
            ORDER BY value DESC
        `);
        stats.valuationByProject = valuationByProject.rows;

        // 2. Valuation by Warehouse
        const valuationByWarehouse = await pool.query(`
            SELECT 
                COALESCE(warehouse, 'Main') as name,
                SUM(remaining_qty * buy_price) as value
            FROM inventory_items
            WHERE remaining_qty > 0
            GROUP BY warehouse
            ORDER BY value DESC
        `);
        stats.valuationByWarehouse = valuationByWarehouse.rows;

        // 3. Low Stock Alerts
        const lowStock = await pool.query(`
            SELECT item_name, remaining_qty, min_stock_level, uom
            FROM inventory_items
            WHERE remaining_qty <= min_stock_level AND remaining_qty > 0
            LIMIT 10
        `);
        stats.lowStock = lowStock.rows;

        // 4. Sales vs Purchases Trend (Last 6 Months)
        const trend = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', current_date) - interval '5 months',
                    date_trunc('month', current_date),
                    interval '1 month'
                )::date as month
            ),
            sales AS (
                SELECT date_trunc('month', date)::date as month, SUM(total_amount) as amount
                FROM inventory_sales
                GROUP BY 1
            ),
            purchases AS (
                SELECT date_trunc('month', created_at)::date as month, SUM(qty * estimated_cost * fx_rate) as amount
                FROM purchase_orders
                GROUP BY 1
            )
            SELECT 
                to_char(m.month, 'Mon YYYY') as month_label,
                COALESCE(s.amount, 0) as sales,
                COALESCE(p.amount, 0) as purchases
            FROM months m
            LEFT JOIN sales s ON m.month = s.month
            LEFT JOIN purchases p ON m.month = p.month
            ORDER BY m.month ASC
        `);
        stats.trend = trend.rows;

        // 5. Stock Aging (Categorized by creation date)
        const aging = await pool.query(`
            SELECT 
                CASE 
                    WHEN created_at > current_date - interval '30 days' THEN '0-30 Days'
                    WHEN created_at > current_date - interval '90 days' THEN '31-90 Days'
                    ELSE 'Over 90 Days'
                END as age_group,
                COUNT(*) as item_count,
                SUM(remaining_qty * buy_price) as total_value
            FROM inventory_items
            WHERE remaining_qty > 0
            GROUP BY 1
            ORDER BY 1
        `);
        stats.aging = aging.rows;

        // 6. Top Moving Items (By Sales Qty)
        const topMoving = await pool.query(`
            SELECT item_name, SUM(qty) as total_qty, COUNT(*) as txn_count
            FROM inventory_sales
            GROUP BY item_name
            ORDER BY total_qty DESC
            LIMIT 5
        `);
        stats.topMoving = topMoving.rows;

        res.json(stats);
    } catch (err) {
        console.error("🔥 [ERROR] getInventoryIntelligence failed:", err);
        res.status(500).json({ error: err.message });
    }
};

const handleSupplierDeposit = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { supplier_name, amount, currency, fx_rate, project_name, payment_method, reference_no, date, master_po_no } = req.body;
        const username = req.user ? req.user.username : 'System';

        if (!supplier_name || !amount || !payment_method) {
            throw new Error("Missing required fields: supplier_name, amount, payment_method are required.");
        }

        const AccountingService = require('../services/accountingService');

        // --- MANDATORY: DATABASE LOCKING TO PREVENT DOUBLE-PROCESSING RACE CONDITIONS ---
        // We lock the MPO reference in the purchase_orders table to serialize all requests for this specific MPO.
        if (master_po_no && master_po_no !== 'N/A') {
            await client.query(`SELECT id FROM purchase_orders WHERE master_po_no = $1 FOR UPDATE`, [master_po_no]);
        }

        // --- NEW: Validation Check to ensure Total Paid does not exceed Total MPO Value ---
        if (master_po_no && master_po_no !== 'N/A') {
            const mpoValueRes = await client.query(`
                SELECT SUM(qty * estimated_cost) as total_fcy
                FROM purchase_orders
                WHERE master_po_no = $1
            `, [master_po_no]);
            
            const totalMpoFcy = parseFloat(mpoValueRes.rows[0].total_fcy || 0);

            if (totalMpoFcy > 0) {
                // Fetch existing deposits for this MPO from the ledger
                const existingDepositsRes = await client.query(`
                    SELECT description FROM ledger 
                    WHERE description LIKE $1 
                    AND description LIKE '%Supplier Deposit:%'
                    AND debit > 0
                `, [`%| MPO: ${master_po_no}%`]);

                let existingFcy = 0;
                existingDepositsRes.rows.forEach(row => {
                    const parts = (row.description || '').split('|');
                    if (parts.length >= 2) {
                        const amtPart = parts[1].trim().split(' ')[0];
                        if (!isNaN(parseFloat(amtPart))) existingFcy += parseFloat(amtPart);
                    }
                });

                const currentDepositFcy = parseFloat(amount);
                if ((existingFcy + currentDepositFcy) > (totalMpoFcy + 0.01)) { // Added small tolerance for precision
                    throw new Error(`Financial Integrity Alert: Total deposits (${(existingFcy + currentDepositFcy).toFixed(2)}) would exceed the Total MPO Value (${totalMpoFcy.toFixed(2)}). Operation aborted.`);
                }
            }
        }

        // Debit: Supplier (2110) with Debit balance (Prepayment)
        const debitAcc = '2110'; 
        // Credit: User-selected account or fallback to legacy logic
        const creditAcc = req.body.credit_account || (payment_method.toLowerCase().includes('bank') ? '1111' : '1101');
        const whtAcc = '2160'; // Withholding Tax Payable Account

        const amountNum = parseFloat(amount);
        const rateNum = parseFloat(fx_rate) || 1;
        const whtPercent = parseFloat(req.body.wht_percent || 0);
        
        const grossLcy = amountNum * rateNum;
        const whtLcy = (grossLcy * whtPercent) / 100;
        const netLcy = grossLcy - whtLcy;

        if (isNaN(grossLcy) || grossLcy <= 0) {
            throw new Error(`Invalid deposit amount or rate. Amount: ${amount}, Rate: ${fx_rate}`);
        }

        // 2. Record Double Entry (Splitting Net and WHT)
        // Note: For simplicity and integrity, we record the Gross as Debit to Supplier, 
        // and split Credit between Bank/Cash and WHT Payable.
        
        // A. Supplier Debit (Gross)
        const debitId = await AccountingService.logEntry(client, debitAcc, project_name, grossLcy, 0, `Supplier Deposit: ${supplier_name} | ${amountNum} ${currency} (Rate: ${rateNum}) | MPO: ${master_po_no || 'N/A'}`, username, reference_no, null, 'Inventory');

        // B. Bank/Cash Credit (Net)
        const creditId = await AccountingService.logEntry(client, creditAcc, project_name, 0, netLcy, `Supplier Deposit (Net Payment): ${supplier_name} | MPO: ${master_po_no || 'N/A'}`, username, reference_no, null, 'Inventory');

        // C. WHT Credit (Tax Liability)
        if (whtLcy > 0) {
            await AccountingService.logEntry(client, whtAcc, project_name, 0, whtLcy, `WHT ${whtPercent}% on Deposit: ${supplier_name} | MPO: ${master_po_no || 'N/A'}`, username, reference_no, null, 'Inventory');
        }

        const result = { success: true, debitId, creditId };

        if (!result || !result.success) {
            console.error("🔥 [Accounting Error] result:", result);
            throw new Error("Failed to record accounting entry. Ensure accounts and balances are valid.");
        }

        console.log(`[SUPPLIER DEPOSIT] Ledger Entry recorded: ${result.debitId} / ${result.creditId}`);

        await logAudit(username, 'SUPPLIER_DEPOSIT', 'suppliers', null, `Recorded deposit of ${amount} ${currency} for ${supplier_name}`);

        // 3. Update Weighted Average Rate per MPO (instead of Supplier)
        if (master_po_no) {
            // Fetch all deposits for this SPECIFIC MPO from the ledger
            const mpoLedgerRes = await client.query(`
                SELECT description FROM ledger 
                WHERE description LIKE $1 
                AND description LIKE '%Supplier Deposit:%'
            `, [`%| MPO: ${master_po_no}%`]);

            let mpoTotalLcy = 0;
            let mpoTotalFcy = 0;

            mpoLedgerRes.rows.forEach(row => {
                const desc = row.description;
                if (!desc) return;

                const parts = desc.split('|');
                if (parts.length >= 2) {
                    // Expected format: "Supplier Deposit: Name | 1000 USD (Rate: 3.75) | MPO: ... | Ref: ..."
                    const amountPart = parts[1].trim().split(' ');
                    const fcy = parseFloat(amountPart[0]);
                    
                    let rate = 1;
                    if (desc.includes('Rate:')) {
                        const rateMatch = desc.match(/Rate:\s*([\d.]+)/);
                        if (rateMatch) rate = parseFloat(rateMatch[1]);
                    }
                    
                    if (!isNaN(fcy) && !isNaN(rate)) {
                        mpoTotalFcy += fcy;
                        mpoTotalLcy += (fcy * rate);
                    }
                }
            });

            if (mpoTotalFcy > 0) {
                const mpoAvgRate = mpoTotalLcy / mpoTotalFcy;
                // Update only purchase orders for this specific MPO
                await client.query(`
                    UPDATE purchase_orders 
                    SET fx_rate = $1,
                        lcy_total = (qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0),
                        unit_cost_after_ddp = ((qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0)) / NULLIF(qty, 0)
                    WHERE master_po_no = $2
                `, [mpoAvgRate, master_po_no]);

                // Update only inventory items linked to this MPO
                await client.query(`
                    UPDATE inventory_items
                    SET buy_price = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        avg_cost = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        lcy_fx_rate = $1
                    WHERE master_po_no = $2
                `, [mpoAvgRate, master_po_no]);
                
                await logAudit(username, 'UPDATE_MPO_AVERAGE_RATE', 'purchase_orders', master_po_no, `Updated MPO ${master_po_no} weighted average rate to ${mpoAvgRate.toFixed(4)}`);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "Supplier deposit recorded and Global weighted average rate updated successfully.", entry: result });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("🔥 Supplier Deposit Error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const deleteSupplierDeposit = async (req, res) => {
    const { id } = req.params;
    const username = req.user ? req.user.username : 'System';
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Fetch the deposit entry with high-precision raw timestamp
        const entryRes = await client.query("SELECT *, created_at::text as created_at_raw FROM ledger WHERE id = $1", [id]);
        if (entryRes.rows.length === 0) {
            throw new Error("Deposit entry not found.");
        }
        const entry = entryRes.rows[0];
        
        if (!entry.description || !entry.description.includes('Supplier Deposit:')) {
            throw new Error("This entry is not a valid supplier deposit.");
        }

        // Extract master_po_no from description
        let master_po_no = null;
        if (entry.description.includes('MPO:')) {
            const mpoPart = entry.description.split('MPO:')[1].trim();
            master_po_no = mpoPart.split('|')[0].trim().split(' ')[0].trim();
            if (master_po_no === 'N/A') master_po_no = null;
        }

        // 2. Delete all ledger entries in the exact same transaction (matching high-precision timestamp and creator)
        // Bypass the PL/pgSQL ledger deletion block for this administrative correction
        await client.query("ALTER TABLE ledger DISABLE TRIGGER ALL");
        await client.query(
            "DELETE FROM ledger WHERE created_at = $1::timestamptz AND created_by = $2", 
            [entry.created_at_raw, entry.created_by]
        );
        await client.query("ALTER TABLE ledger ENABLE TRIGGER ALL");

        // 3. Recalculate and update the MPO Weighted Average Rate
        if (master_po_no) {
            const mpoLedgerRes = await client.query(`
                SELECT description FROM ledger 
                WHERE description LIKE $1 
                AND description LIKE '%Supplier Deposit:%'
                AND debit > 0
            `, [`%| MPO: ${master_po_no}%`]);

            let mpoTotalLcy = 0;
            let mpoTotalFcy = 0;

            mpoLedgerRes.rows.forEach(row => {
                const desc = row.description;
                if (!desc) return;

                const parts = desc.split('|');
                if (parts.length >= 2) {
                    const amountPart = parts[1].trim().split(' ');
                    const fcy = parseFloat(amountPart[0]);
                    
                    let rate = 1;
                    if (desc.includes('Rate:')) {
                        const rateMatch = desc.match(/Rate:\s*([\d.]+)/);
                        if (rateMatch) rate = parseFloat(rateMatch[1]);
                    }
                    
                    if (!isNaN(fcy) && !isNaN(rate)) {
                        mpoTotalFcy += fcy;
                        mpoTotalLcy += (fcy * rate);
                    }
                }
            });

            if (mpoTotalFcy > 0) {
                const mpoAvgRate = mpoTotalLcy / mpoTotalFcy;
                await client.query(`
                    UPDATE purchase_orders 
                    SET fx_rate = $1,
                        lcy_total = (qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0),
                        unit_cost_after_ddp = ((qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0)) / NULLIF(qty, 0)
                    WHERE master_po_no = $2
                `, [mpoAvgRate, master_po_no]);

                await client.query(`
                    UPDATE inventory_items
                    SET buy_price = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        avg_cost = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        lcy_fx_rate = $1
                    WHERE master_po_no = $2
                `, [mpoAvgRate, master_po_no]);
                
                await logAudit(username, 'UPDATE_MPO_AVERAGE_RATE', 'purchase_orders', master_po_no, `Updated MPO ${master_po_no} weighted average rate to ${mpoAvgRate.toFixed(4)} after deposit deletion`);
            } else {
                // Reset to default
                await client.query(`
                    UPDATE purchase_orders 
                    SET fx_rate = 1,
                        lcy_total = (qty * estimated_cost * 1) + COALESCE(ddp_lcy_added_amount, 0),
                        unit_cost_after_ddp = ((qty * estimated_cost * 1) + COALESCE(ddp_lcy_added_amount, 0)) / NULLIF(qty, 0)
                    WHERE master_po_no = $1
                `, [master_po_no]);

                await client.query(`
                    UPDATE inventory_items
                    SET buy_price = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        avg_cost = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        lcy_fx_rate = 1
                    WHERE master_po_no = $1
                `, [master_po_no]);
                
                await logAudit(username, 'UPDATE_MPO_AVERAGE_RATE', 'purchase_orders', master_po_no, `Reset MPO ${master_po_no} rate to 1.0000 after all deposits deleted`);
            }
        }

        await logAudit(username, 'DELETE_SUPPLIER_DEPOSIT', 'ledger', id, `Deleted supplier deposit ledger entries for transaction at ${entry.created_at}`);
        await client.query('COMMIT');
        res.json({ success: true, message: "Supplier deposit deleted successfully." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("🔥 Error deleting supplier deposit:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const editSupplierDeposit = async (req, res) => {
    const { id } = req.params;
    const { supplier_name, amount, currency, fx_rate, project_name, payment_method, reference_no, date, master_po_no } = req.body;
    const username = req.user ? req.user.username : 'System';
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch the existing entry with high-precision raw timestamp
        const entryRes = await client.query("SELECT *, created_at::text as created_at_raw FROM ledger WHERE id = $1", [id]);
        if (entryRes.rows.length === 0) {
            throw new Error("Deposit entry not found.");
        }
        const entry = entryRes.rows[0];

        if (!entry.description || !entry.description.includes('Supplier Deposit:')) {
            throw new Error("This entry is not a valid supplier deposit.");
        }

        // Get old master PO no to reset if changed
        let old_master_po_no = null;
        if (entry.description.includes('MPO:')) {
            const mpoPart = entry.description.split('MPO:')[1].trim();
            old_master_po_no = mpoPart.split('|')[0].trim().split(' ')[0].trim();
            if (old_master_po_no === 'N/A') old_master_po_no = null;
        }

        // 2. Delete all ledger entries in the exact same transaction (matching high-precision timestamp and creator)
        // Bypass the PL/pgSQL ledger deletion block for this administrative correction
        await client.query("ALTER TABLE ledger DISABLE TRIGGER ALL");
        await client.query(
            "DELETE FROM ledger WHERE created_at = $1::timestamptz AND created_by = $2", 
            [entry.created_at_raw, entry.created_by]
        );
        await client.query("ALTER TABLE ledger ENABLE TRIGGER ALL");

        // 3. Validate new MPO limit
        if (master_po_no && master_po_no !== 'N/A') {
            const mpoValueRes = await client.query(`
                SELECT SUM(qty * estimated_cost) as total_fcy
                FROM purchase_orders
                WHERE master_po_no = $1
            `, [master_po_no]);
            
            const totalMpoFcy = parseFloat(mpoValueRes.rows[0].total_fcy || 0);

            if (totalMpoFcy > 0) {
                const existingDepositsRes = await client.query(`
                    SELECT description FROM ledger 
                    WHERE description LIKE $1 
                    AND description LIKE '%Supplier Deposit:%'
                    AND debit > 0
                `, [`%| MPO: ${master_po_no}%`]);

                let existingFcy = 0;
                existingDepositsRes.rows.forEach(row => {
                    const parts = (row.description || '').split('|');
                    if (parts.length >= 2) {
                        const amtPart = parts[1].trim().split(' ')[0];
                        if (!isNaN(parseFloat(amtPart))) existingFcy += parseFloat(amtPart);
                    }
                });

                const currentDepositFcy = parseFloat(amount);
                if ((existingFcy + currentDepositFcy) > (totalMpoFcy + 0.01)) {
                    throw new Error(`Financial Integrity Alert: Total deposits (${(existingFcy + currentDepositFcy).toFixed(2)}) would exceed the Total MPO Value (${totalMpoFcy.toFixed(2)}). Operation aborted.`);
                }
            }
        }

        // 4. Log the new double entry
        const AccountingService = require('../services/accountingService');
        const debitAcc = '2110';
        const creditAcc = req.body.credit_account || (payment_method.toLowerCase().includes('bank') ? '1111' : '1101');
        const whtAcc = '2160';

        const amountNum = parseFloat(amount);
        const rateNum = parseFloat(fx_rate) || 1;
        const whtPercent = parseFloat(req.body.wht_percent || 0);
        
        const grossLcy = amountNum * rateNum;
        const whtLcy = (grossLcy * whtPercent) / 100;
        const netLcy = grossLcy - whtLcy;

        if (isNaN(grossLcy) || grossLcy <= 0) {
            throw new Error(`Invalid deposit amount or rate. Amount: ${amount}, Rate: ${fx_rate}`);
        }

        const debitId = await AccountingService.logEntry(client, debitAcc, project_name, grossLcy, 0, `Supplier Deposit: ${supplier_name} | ${amountNum} ${currency} (Rate: ${rateNum}) | MPO: ${master_po_no || 'N/A'}`, username, reference_no, null, 'Inventory');
        const creditId = await AccountingService.logEntry(client, creditAcc, project_name, 0, netLcy, `Supplier Deposit (Net Payment): ${supplier_name} | MPO: ${master_po_no || 'N/A'}`, username, reference_no, null, 'Inventory');

        if (whtLcy > 0) {
            await AccountingService.logEntry(client, whtAcc, project_name, 0, whtLcy, `WHT ${whtPercent}% on Deposit: ${supplier_name} | MPO: ${master_po_no || 'N/A'}`, username, reference_no, null, 'Inventory');
        }

        // 5. Recalculate Weighted Average Rate for new MPO
        if (master_po_no) {
            const mpoLedgerRes = await client.query(`
                SELECT description FROM ledger 
                WHERE description LIKE $1 
                AND description LIKE '%Supplier Deposit:%'
                AND debit > 0
            `, [`%| MPO: ${master_po_no}%`]);

            let mpoTotalLcy = 0;
            let mpoTotalFcy = 0;

            mpoLedgerRes.rows.forEach(row => {
                const desc = row.description;
                if (!desc) return;

                const parts = desc.split('|');
                if (parts.length >= 2) {
                    const amountPart = parts[1].trim().split(' ');
                    const fcy = parseFloat(amountPart[0]);
                    
                    let rate = 1;
                    if (desc.includes('Rate:')) {
                        const rateMatch = desc.match(/Rate:\s*([\d.]+)/);
                        if (rateMatch) rate = parseFloat(rateMatch[1]);
                    }
                    
                    if (!isNaN(fcy) && !isNaN(rate)) {
                        mpoTotalFcy += fcy;
                        mpoTotalLcy += (fcy * rate);
                    }
                }
            });

            if (mpoTotalFcy > 0) {
                const mpoAvgRate = mpoTotalLcy / mpoTotalFcy;
                await client.query(`
                    UPDATE purchase_orders 
                    SET fx_rate = $1,
                        lcy_total = (qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0),
                        unit_cost_after_ddp = ((qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0)) / NULLIF(qty, 0)
                    WHERE master_po_no = $2
                `, [mpoAvgRate, master_po_no]);

                await client.query(`
                    UPDATE inventory_items
                    SET buy_price = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        avg_cost = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        lcy_fx_rate = $1
                    WHERE master_po_no = $2
                `, [mpoAvgRate, master_po_no]);
            }
        }

        // 6. Recalculate Weighted Average Rate for OLD MPO if it is different
        if (old_master_po_no && old_master_po_no !== master_po_no) {
            const mpoLedgerRes = await client.query(`
                SELECT description FROM ledger 
                WHERE description LIKE $1 
                AND description LIKE '%Supplier Deposit:%'
                AND debit > 0
            `, [`%| MPO: ${old_master_po_no}%`]);

            let mpoTotalLcy = 0;
            let mpoTotalFcy = 0;

            mpoLedgerRes.rows.forEach(row => {
                const desc = row.description;
                if (!desc) return;

                const parts = desc.split('|');
                if (parts.length >= 2) {
                    const amountPart = parts[1].trim().split(' ');
                    const fcy = parseFloat(amountPart[0]);
                    
                    let rate = 1;
                    if (desc.includes('Rate:')) {
                        const rateMatch = desc.match(/Rate:\s*([\d.]+)/);
                        if (rateMatch) rate = parseFloat(rateMatch[1]);
                    }
                    
                    if (!isNaN(fcy) && !isNaN(rate)) {
                        mpoTotalFcy += fcy;
                        mpoTotalLcy += (fcy * rate);
                    }
                }
            });

            if (mpoTotalFcy > 0) {
                const mpoAvgRate = mpoTotalLcy / mpoTotalFcy;
                await client.query(`
                    UPDATE purchase_orders 
                    SET fx_rate = $1,
                        lcy_total = (qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0),
                        unit_cost_after_ddp = ((qty * estimated_cost * $1) + COALESCE(ddp_lcy_added_amount, 0)) / NULLIF(qty, 0)
                    WHERE master_po_no = $2
                `, [mpoAvgRate, old_master_po_no]);

                await client.query(`
                    UPDATE inventory_items
                    SET buy_price = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        avg_cost = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        lcy_fx_rate = $1
                    WHERE master_po_no = $2
                `, [mpoAvgRate, old_master_po_no]);
            } else {
                await client.query(`
                    UPDATE purchase_orders 
                    SET fx_rate = 1,
                        lcy_total = (qty * estimated_cost * 1) + COALESCE(ddp_lcy_added_amount, 0),
                        unit_cost_after_ddp = ((qty * estimated_cost * 1) + COALESCE(ddp_lcy_added_amount, 0)) / NULLIF(qty, 0)
                    WHERE master_po_no = $1
                `, [old_master_po_no]);

                await client.query(`
                    UPDATE inventory_items
                    SET buy_price = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        avg_cost = (SELECT unit_cost_after_ddp FROM purchase_orders WHERE id = inventory_items.po_id),
                        lcy_fx_rate = 1
                    WHERE master_po_no = $1
                `, [old_master_po_no]);
            }
        }

        await logAudit(username, 'EDIT_SUPPLIER_DEPOSIT', 'ledger', id, `Updated supplier deposit of ${amount} ${currency} for ${supplier_name}`);
        await client.query('COMMIT');
        res.json({ success: true, message: "Supplier deposit updated successfully." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("🔥 Error editing supplier deposit:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = { 
    transferStock, 
    handleTransfer: transferStock,
    reconcileAudit, 
    getInventoryIntelligence,
    handleSupplierDeposit,
    deleteSupplierDeposit,
    editSupplierDeposit,
    getFinancialAccounts: async (req, res) => {
        try {
            const query = `
                SELECT id, account_code, account_name 
                FROM chart_of_accounts 
                WHERE account_code LIKE '110%' OR account_code LIKE '111%'
                ORDER BY account_code ASC
            `;
            const result = await pool.query(query);
            res.json({ success: true, data: result.rows });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }
};
