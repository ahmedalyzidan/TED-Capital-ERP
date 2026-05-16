const pool = require('../config/db');
const { logAudit, logAdvancedAudit } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const AccountingService = require('../services/accountingService');

const receivePO = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Use req.user or fallback for audit
        const username = req.user ? req.user.username : 'System';

        const poRes = await client.query("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        if (poRes.rows.length === 0) throw new Error("أمر الشراء غير موجود.");
        const po = poRes.rows[0];

        if (po.status !== 'Approved' && po.status !== 'Pending') {
            throw new Error("يجب أن يكون أمر الشراء معتمداً أو قيد الانتظار.");
        }

        let totalLandedCostLocal = 0;

        try {
            const expensesRes = await client.query("SELECT SUM(local_amount) as sum FROM po_expenses WHERE po_id = $1", [po.id]);
            totalLandedCostLocal += parseFloat(expensesRes.rows[0]?.sum || 0);
        } catch (e) { /* ignore */ }

        try {
            const ddpFcyRes = await client.query("SELECT SUM(amount) as sum FROM po_ddp_charges WHERE po_id = $1", [po.id]);
            const ddpLcyRes = await client.query("SELECT SUM(amount) as sum FROM po_ddp_lcy_charges WHERE po_id = $1", [po.id]);
            const fx = parseFloat(po.fx_rate) || 1;
            totalLandedCostLocal += (parseFloat(ddpFcyRes.rows[0]?.sum || 0) * fx) + parseFloat(ddpLcyRes.rows[0]?.sum || 0);
        } catch (e) { /* ignore */ }

        const q = parseFloat(po.qty) || 1;
        const ucFcy = parseFloat(po.estimated_cost) || 0;
        const fx = parseFloat(po.fx_rate) || 1;
        
        const exWorkLocal = q * ucFcy * fx;
        const finalTotalCost = exWorkLocal + totalLandedCostLocal;
        const unitCostLcy = q > 0 ? (finalTotalCost / q) : 0;
        
        const itemName = po.item_description || `Item from PO-${po.id}`;

        let finalValuationPrice = unitCostLcy;
        
        const checkInv = await client.query("SELECT remaining_qty, buy_price FROM inventory_items WHERE item_name = $1 LIMIT 1", [itemName]);
        
        if (checkInv.rows.length > 0) {
            const currentQty = parseFloat(checkInv.rows[0].remaining_qty) || 0;
            const currentPrice = parseFloat(checkInv.rows[0].buy_price) || 0;
            
            const totalQty = currentQty + q;
            finalValuationPrice = totalQty > 0 ? ((currentQty * currentPrice) + (q * unitCostLcy)) / totalQty : unitCostLcy;
            
            await client.query("UPDATE inventory_items SET buy_price = $1, avg_cost = $1, lcy_fx_rate = $2 WHERE item_name = $3", [finalValuationPrice, po.lcy_fx_rate || po.fx_rate || 1, itemName]);
        }

        const invInsert = await client.query(
            "INSERT INTO inventory_items (po_id, item_name, item_description, project_name, master_po_no, quantity, remaining_qty, buy_price, avg_cost, lcy_fx_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9) RETURNING id",
            [po.id, itemName, po.item_description, po.project_name || 'General', po.master_po_no, po.qty || 0, po.qty || 0, finalValuationPrice, po.lcy_fx_rate || po.fx_rate || 1]
        );
        const invId = invInsert.rows[0].id;

        // --- Auto-link Pending Bookings ---
        const bookingsRes = await client.query("SELECT id, qty FROM inventory_bookings WHERE po_id = $1 AND status = 'Pending' AND inventory_id IS NULL", [po.id]);
        let totalBookedQty = 0;
        for (const booking of bookingsRes.rows) {
            await client.query("UPDATE inventory_bookings SET inventory_id = $1 WHERE id = $2", [invId, booking.id]);
            totalBookedQty += parseFloat(booking.qty);
        }
        if (totalBookedQty > 0) {
            await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2", [totalBookedQty, invId]);
        }

        await client.query(`
            UPDATE purchase_orders 
            SET status = 'Received',
                lcy_total = $2,
                unit_cost_after_ddp = $3
            WHERE id = $1
        `, [req.params.id, finalTotalCost, unitCostLcy]);

        // Accounting Integration: Double Entry for Goods Receipt
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1130',          // Inventory (Asset)
            creditAccount: '2110',         // Suppliers/AP (Liability)
            amount: finalTotalCost,
            costCenter: po.project_name || 'General',
            description: `استلام أمر شراء PO-${po.id} وتعلية المخزون`,
            username: username
        });

        await logAudit(username, 'RECEIVE_PO', 'purchase_orders', po.id, `Received PO #${po.id} into Inventory`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم استلام البضاعة وتوليد القيود المحاسبية بنجاح!" });
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("[API ERROR] POST /action/receive_po:", err);
        res.status(500).json({ error: err.message || "حدث خطأ داخلي أثناء استلام البضاعة." }); 
    } finally {
        client.release();
    }
};

const reReceivePO = async (req, res) => {
    const client = await pool.connect();
    try {
        if (!hasAccess(req.user, 'inventory', 'create')) {
            throw new Error("Access Denied.");
        }
        await client.query('BEGIN');
        
        const username = req.user ? req.user.username : 'System';

        const poRes = await client.query("SELECT * FROM purchase_orders WHERE id = $1", [req.params.id]);
        if (poRes.rows.length === 0) throw new Error("PO not found.");
        const po = poRes.rows[0];
        
        const checkExist = await client.query("SELECT id FROM inventory_items WHERE po_id = $1", [req.params.id]);
        if (checkExist.rows.length > 0) {
            throw new Error("هذه البضاعة موجودة بالفعل في المخزن ولا يمكن إعادة استلامها مرة أخرى.");
        }
        
        let totalLandedCostLocal = 0;
        try {
            const expensesRes = await client.query("SELECT SUM(local_amount) as sum FROM po_expenses WHERE po_id = $1", [po.id]);
            totalLandedCostLocal += parseFloat(expensesRes.rows[0]?.sum || 0);
        } catch (e) {}

        const q = parseFloat(po.qty) || 1;
        const ucFcy = parseFloat(po.estimated_cost) || 0;
        const fx = parseFloat(po.fx_rate) || 1;
        
        const exWorkLocal = q * ucFcy * fx;
        const finalTotalCost = exWorkLocal + totalLandedCostLocal;
        const unitCostLcy = q > 0 ? (finalTotalCost / q) : 0;

        const itemName = po.item_description || `Item from PO-${po.id}`;

        await client.query(
            "INSERT INTO inventory_items (po_id, item_name, project_name, quantity, remaining_qty, buy_price, avg_cost, lcy_fx_rate) VALUES ($1, $2, $3, $4, $5, $6, $6, $7)",
            [po.id, itemName, po.project_name || 'General', po.qty || 0, po.qty || 0, unitCostLcy, po.lcy_fx_rate || po.fx_rate || 1]
        );

        await client.query(`
            UPDATE purchase_orders 
            SET status = 'Re-received',
                lcy_total = $2,
                unit_cost_after_ddp = $3
            WHERE id = $1
        `, [req.params.id, finalTotalCost, unitCostLcy]);
        
        // Accounting Integration: Double Entry for Goods Receipt
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1130',
            creditAccount: '2110',
            amount: finalTotalCost,
            costCenter: po.project_name || 'General',
            description: `إعادة استلام أمر شراء PO-${po.id} وتعلية المخزون`,
            username: username
        });

        await logAudit(username, 'RE-RECEIVE_PO', 'purchase_orders', req.params.id, `Re-received PO #${req.params.id} into Inventory`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم إعادة الاستلام بنجاح وتحديث الأرصدة والقيود المحاسبية." });
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("[API ERROR] POST /action/rereceive_po:", err);
        res.status(500).json({ error: err.message }); 
    } finally {
        client.release();
    }
};

const convertRFQtoPO = async (req, res) => {
    try {
        if (!hasAccess(req.user, 'purchase_orders', 'create')) return res.status(403).json({ error: "Access Denied." });
        const rfqRes = await pool.query("SELECT * FROM rfq WHERE id = $1", [req.params.id]);
        if (rfqRes.rows.length === 0) return res.status(404).json({ error: "RFQ not found." });
        const rfq = rfqRes.rows[0];
        if (!rfq.status || !rfq.status.includes('Approved')) return res.status(400).json({ error: "RFQ must be approved first." });
        if (!rfq.selected_vendor) return res.status(400).json({ error: "No vendor selected." });

        let estCost = 0; const sv = rfq.selected_vendor.toLowerCase();
        if (rfq.vendor_1 && sv === rfq.vendor_1.toLowerCase()) estCost = rfq.price_1 || 0;
        else if (rfq.vendor_2 && sv === rfq.vendor_2.toLowerCase()) estCost = rfq.price_2 || 0;
        else if (rfq.vendor_3 && sv === rfq.vendor_3.toLowerCase()) estCost = rfq.price_3 || 0;

        const insertRes = await pool.query(
            "INSERT INTO purchase_orders (item_description, qty, estimated_cost, supplier, project_name, status, fx_rate) VALUES ($1, $2, $3, $4, $5, 'Pending', 1) RETURNING id",
            [rfq.item_description, rfq.qty, estCost, rfq.selected_vendor, rfq.project_name]
        );
        await pool.query("UPDATE rfq SET status = 'Converted to PO' WHERE id = $1", [req.params.id]);
        await logAudit(req.user.username, 'CREATE_PO', 'purchase_orders', insertRes.rows[0].id, `Created PO from RFQ #${req.params.id}`);
        res.json({ success: true });
    } catch (err) { 
        console.error("[API ERROR] convertRFQtoPO:", err);
        res.status(500).json({ error: err.message }); 
    }
};

const getMPO360 = async (req, res) => {
    try {
        const mpo = req.params.mpo || req.query.mpo;
        if (!mpo) return res.status(400).json({ error: "MPO number is required" });

        // 1. Fetch POs
        const posRes = await pool.query("SELECT * FROM purchase_orders WHERE (master_po_no = $1 OR id::text = $1) AND is_deleted = false", [mpo]);
        const pos = posRes.rows;
        const poIds = pos.map(p => p.id);
        
        if (pos.length === 0) return res.json({ pos: [], deposits: [], ddp: [], stock: [], sales: [], bookings: [], clientTxns: [], summary: {} });

        // 2. Fetch Supplier Deposits (Payments to Supplier)
        const depositsRes = await pool.query("SELECT * FROM ledger WHERE (description ILIKE $1 OR reference_no ILIKE $1) AND is_deleted = false", [`%${mpo}%`]);
        const deposits = depositsRes.rows;

        // 3. Fetch Landed Costs (DDP) from po_ddp_lcy_charges
        const ddpRes = await pool.query("SELECT d.*, po.master_po_no FROM po_ddp_lcy_charges d LEFT JOIN purchase_orders po ON d.po_id = po.id WHERE d.po_id = ANY($1) OR po.master_po_no = $2", [poIds, mpo]);
        const ddp = ddpRes.rows;

        // 4. Fetch Stock Items
        const stockRes = await pool.query("SELECT * FROM inventory_items WHERE po_id = ANY($1)", [poIds]);
        const stock = stockRes.rows;
        const stockIds = stock.map(s => s.id);
        
        // 5. Fetch Sales & Bookings
        let sales = [];
        let bookings = [];
        if (stockIds.length > 0) {
            const salesRes = await pool.query("SELECT * FROM inventory_sales WHERE inventory_id = ANY($1) AND is_deleted = false", [stockIds]);
            sales = salesRes.rows;
            const bookRes = await pool.query("SELECT * FROM inventory_bookings WHERE inventory_id = ANY($1) AND is_deleted = false", [stockIds]);
            bookings = bookRes.rows;
        }

        // 6. Fetch Client Transactions (Payments from Customers)
        // We look for ledger entries linked to the clients of these sales
        const clientNames = [...new Set(sales.map(s => s.customer_name).concat(bookings.map(b => b.customer_name)))].filter(Boolean);
        let clientTxns = [];
        if (clientNames.length > 0) {
            const txnsRes = await pool.query(
                "SELECT * FROM ledger WHERE (account_name = ANY($1) OR description ILIKE ANY($2)) AND credit > 0 AND is_deleted = false ORDER BY created_at DESC LIMIT 50", 
                [clientNames, clientNames.map(n => `%${n}%`)]
            );
            clientTxns = txnsRes.rows;
        }

        // 7. Audit Logs
        const auditRes = await pool.query("SELECT * FROM audit_logs WHERE record_id = ANY($1) OR details ILIKE $2 ORDER BY created_at DESC LIMIT 30", [poIds, `%${mpo}%`]);

        // 8. Financial Summary Calculation
        const totalPoCostFcy = pos.reduce((sum, p) => sum + (Number(p.estimated_cost) * Number(p.qty)), 0);
        const totalPoCostLcy = pos.reduce((sum, p) => sum + (Number(p.lcy_total || (p.qty * p.estimated_cost * (p.lcy_fx_rate || 1)))), 0);
        const totalDdpLcy = ddp.reduce((sum, d) => sum + Number(d.amount), 0);
        const totalInvestedLcy = totalPoCostLcy + totalDdpLcy;
        
        const totalRevenueLcy = sales.reduce((sum, s) => sum + (Number(s.qty) * Number(s.sell_price)), 0);
        const totalCollectionsLcy = clientTxns.reduce((sum, t) => sum + Number(t.amount), 0);
        
        const remainingQty = stock.reduce((sum, s) => sum + Number(s.remaining_qty), 0);
        const remainingValueLcy = stock.reduce((sum, s) => sum + (Number(s.remaining_qty) * Number(s.avg_cost || s.buy_price)), 0);
        
        const cogsLcy = sales.reduce((sum, s) => {
            const item = stock.find(i => i.id === s.inventory_id);
            return sum + (Number(s.sold_qty) * Number(item?.avg_cost || item?.buy_price || 0));
        }, 0);

        const currentProfitLcy = totalRevenueLcy - cogsLcy;

        res.json({
            pos,
            deposits,
            ddp,
            stock,
            sales,
            bookings,
            clientTxns,
            audits: auditRes.rows,
            summary: {
                totalPoCostFcy,
                totalPoCostLcy,
                totalDdpLcy,
                totalInvestedLcy,
                totalRevenueLcy,
                totalCollectionsLcy,
                remainingQty,
                remainingValueLcy,
                currentProfitLcy,
                projectedProfitLcy: (totalRevenueLcy / (sales.reduce((s, x) => s + Number(x.sold_qty), 0) || 1) * pos.reduce((s, p) => s + Number(p.qty), 0)) - totalInvestedLcy
            }
        });
    } catch (err) {
        console.error("MPO 360 Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const allocateExpense = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { allocation_type, po_id, master_po_no, expense_name, amount, currency, fx_rate, expense_date } = req.body;
        const username = req.user ? req.user.username : 'System';
        const localAmount = parseFloat(amount) * parseFloat(fx_rate || 1);

        if (allocation_type === 'master' && master_po_no) {
            // Master Allocation Logic
            const posRes = await client.query("SELECT id, qty, estimated_cost, fx_rate FROM purchase_orders WHERE master_po_no = $1", [master_po_no]);
            if (posRes.rows.length === 0) throw new Error("لا توجد أوامر شراء مرتبطة بهذا الرقم المجمع.");

            // 1. Calculate Total Ex-Work Value of all items in Master
            const pos = posRes.rows.map(p => ({
                id: p.id,
                totalExWork: parseFloat(p.qty || 0) * parseFloat(p.estimated_cost || 0) * parseFloat(p.fx_rate || 1)
            }));
            const masterTotalExWork = pos.reduce((sum, p) => sum + p.totalExWork, 0);

            if (masterTotalExWork === 0) throw new Error("إجمالي قيمة البنود صفر، لا يمكن التوزيع.");

            // 2. Distribute proportionally
            for (const p of pos) {
                const ratio = p.totalExWork / masterTotalExWork;
                const distributedAmount = localAmount * ratio;
                const distributedFcy = parseFloat(amount) * ratio;

                await client.query(
                    "INSERT INTO po_ddp_lcy_charges (po_id, expense_name, amount, fcy_amount, currency, fx_rate, date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                    [p.id, `${expense_name} (Distributed from ${master_po_no})`, distributedAmount, distributedFcy, currency, fx_rate, expense_date || new Date(), username]
                );
            }
        } else if (po_id) {
            // Single Allocation Logic
            await client.query(
                "INSERT INTO po_ddp_lcy_charges (po_id, expense_name, amount, fcy_amount, currency, fx_rate, date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                [po_id, expense_name, localAmount, amount, currency, fx_rate, expense_date || new Date(), username]
            );
        } else {
            throw new Error("يجب تحديد أمر شراء أو رقم مجمع.");
        }

        // 3. Update Inventory Valuation and Accounting if already received
        if (allocation_type === 'master' && master_po_no) {
            const posRes = await client.query("SELECT id, project_name, item_description, qty FROM purchase_orders WHERE master_po_no = $1 AND status = 'Received'", [master_po_no]);
            for (const po of posRes.rows) {
                // Find distributed amount for this specific PO (ratio based)
                const ratioRes = await client.query(`
                    SELECT (q.total / m.total) as ratio 
                    FROM (SELECT (qty * estimated_cost * fx_rate) as total FROM purchase_orders WHERE id = $1) q,
                         (SELECT SUM(qty * estimated_cost * fx_rate) as total FROM purchase_orders WHERE master_po_no = $2) m
                `, [po.id, master_po_no]);
                
                const ratio = parseFloat(ratioRes.rows[0]?.ratio || 0);
                const poDistributedAmount = localAmount * ratio;
                const unitIncrement = poDistributedAmount / (parseFloat(po.qty) || 1);

                if (poDistributedAmount > 0) {
                    // Update Inventory Table
                    await client.query(`
                        UPDATE inventory_items 
                        SET buy_price = buy_price + $1,
                            avg_cost = avg_cost + $1
                        WHERE po_id = $2
                    `, [unitIncrement, po.id]);

                    // Accounting: Increase Inventory Asset
                    await AccountingService.recordDoubleEntry(client, {
                        debitAccount: '1130', creditAccount: '2110', amount: poDistributedAmount,
                        costCenter: po.project_name || 'General',
                        description: `توزيع مصاريف DDP لاحقة (${expense_name}) - PO-${po.id}`, username
                    });
                }
            }
        } else if (po_id) {
            const poRes = await client.query("SELECT status, project_name, qty FROM purchase_orders WHERE id = $1", [po_id]);
            if (poRes.rows.length > 0 && poRes.rows[0].status === 'Received') {
                const po = poRes.rows[0];
                const unitIncrement = localAmount / (parseFloat(po.qty) || 1);
                await client.query(`
                    UPDATE inventory_items 
                    SET buy_price = buy_price + $1,
                        avg_cost = avg_cost + $1
                    WHERE po_id = $2
                `, [unitIncrement, po_id]);

                await AccountingService.recordDoubleEntry(client, {
                    debitAccount: '1130', creditAccount: '2110', amount: localAmount,
                    costCenter: po.project_name || 'General',
                    description: `تحميل مصاريف DDP لاحقة (${expense_name}) - PO-${po_id}`, username
                });
            }
        }

        await logAudit(username, 'ALLOCATE_DDP', 'purchase_orders', master_po_no || po_id, `Allocated ${expense_name} to ${allocation_type}`);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم توزيع المصاريف وتحديث تكلفة المخزون والقيود المحاسبية بنجاح!" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("DDP Allocation Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const deletePO = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';
        const poId = req.params.id;

        const poRes = await client.query("SELECT * FROM purchase_orders WHERE id = $1", [poId]);
        if (poRes.rows.length === 0) throw new Error("أمر الشراء غير موجود.");
        const po = poRes.rows[0];

        // 1. Soft Delete the PO
        await client.query("UPDATE purchase_orders SET is_deleted = true, status = 'Cancelled' WHERE id = $1", [poId]);
        await logAdvancedAudit(client, username, 'purchase_orders', poId, 'DELETE_PO', `Soft deleted PO #${poId} and initiated financial reversal`, po, null);

        // 2. Financial Reversal (Reverse Ledger Entries linked to this PO or MPO)
        // We look for ledger entries where description or reference contains the PO ID or MPO NO
        const mpo = po.master_po_no;
        const ledgerRes = await client.query(
            "SELECT * FROM ledger WHERE (description ILIKE $1 OR reference_no ILIKE $1 OR description ILIKE $2 OR reference_no ILIKE $2) AND is_deleted = false",
            [`%PO-${poId}%`, `%${mpo}%`]
        );

        for (const entry of ledgerRes.rows) {
            // Create reversal entry
            const revRes = await AccountingService.recordDoubleEntry(client, {
                debitAccount: entry.credit_account,
                creditAccount: entry.debit_account,
                amount: entry.amount,
                costCenter: entry.cost_center || 'General',
                description: `إلغاء وعكس القيد رقم ${entry.id} بسبب حذف أمر الشراء PO-${poId}`,
                username: username
            });
            // Mark original entry as reversed/deleted
            await client.query("UPDATE ledger SET is_deleted = true WHERE id = $1", [entry.id]);
            await logAdvancedAudit(client, username, 'ledger', entry.id, 'REVERSAL', `Reversed ledger entry #${entry.id} via reversal entry #${revRes?.debitId || 'N/A'}`, entry, null);
        }

        // 3. Remove from Inventory if Received
        if (po.status === 'Received') {
            const invRes = await client.query("SELECT * FROM inventory_items WHERE po_id = $1", [poId]);
            for (const item of invRes.rows) {
                await logAdvancedAudit(client, username, 'inventory_items', item.id, 'DELETE', `Hard deleted inventory item #${item.id} due to PO #${poId} cancellation`, item, null);
            }
            await client.query("DELETE FROM inventory_items WHERE po_id = $1", [poId]);
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم حذف أمر الشراء وعكس القيود المحاسبية المرتبطة به بنجاح مع تسجيل التدقيق الكامل." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete PO Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = {
    receivePO,
    reReceivePO,
    allocateExpense,
    convertRFQtoPO,
    getMPO360,
    deletePO
};
