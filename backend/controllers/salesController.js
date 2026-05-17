const pool = require('../config/db');
const { logAudit, logAdvancedAudit } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const AccountingService = require('../services/accountingService');
const { checkAndSendLowStockEmail } = require('../config/mailer');

const addSale = async (req, res) => {
    const client = await pool.connect();
    try {
        if (!hasAccess(req.user, 'inventory_sales', 'create')) throw new Error("Access Denied.");
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';
        const data = req.body;

        if (!data.inventory_id || !data.qty || !data.sell_price) throw new Error("Missing required sales fields.");

        const qty = parseFloat(data.qty);
        const sellPrice = parseFloat(data.sell_price);

        const invRes = await client.query("SELECT * FROM inventory_items WHERE id = $1", [data.inventory_id]);
        if (invRes.rows.length === 0) throw new Error("الصنف غير موجود بالمخزن.");
        const invItem = invRes.rows[0];

        if (parseFloat(invItem.remaining_qty) < qty) throw new Error(`الكمية المتاحة غير كافية للحجز أو الصرف. المتاح: ${invItem.remaining_qty}`);

        const buyPrice = parseFloat(invItem.buy_price || invItem.avg_cost || 0);

        const netAmount = qty * sellPrice;
        const vatAmount = parseFloat(data.vat_amount || 0);
        const whtAmount = parseFloat(data.wht_amount || 0);
        const totalSalesRevenue = netAmount + vatAmount - whtAmount;
        
        const downPayment = parseFloat(data.down_payment || 0);
        const walletDeduction = parseFloat(data.wallet_deduction || 0);
        
        // Correct Formula: Balance is what remains after BOTH wallet deduction and cash down payment
        const balanceAmount = totalSalesRevenue - downPayment - walletDeduction;
        const projectName = data.project_name || 'General';

        // 1. Deduct Stock
        await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2", [qty, data.inventory_id]);

        // 2. Record Sale with financial totals (Updated with wallet_deduction)
        const saleRes = await client.query(
            "INSERT INTO inventory_sales (inventory_id, date, customer_name, client_id, project_name, item_name, qty, uom, buy_price, sell_price, payment_method, reference_no, created_by, total_amount, paid_amount, balance_amount, vat_amount, wht_amount, net_amount, batch_no, expiry_date, wallet_deduction) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING id",
            [data.inventory_id, data.date || new Date(), data.customer_name || 'Cash Customer', data.client_id ? parseInt(data.client_id) : null, projectName, invItem.item_name, qty, data.uom || invItem.uom, buyPrice, sellPrice, data.payment_method || 'Partial', data.reference_no, username, totalSalesRevenue, (downPayment + walletDeduction), balanceAmount, vatAmount, whtAmount, netAmount, data.batch_no || invItem.batch_no, data.expiry_date || invItem.expiry_date, walletDeduction]
        );
        const saleId = saleRes.rows[0].id;

        const totalCostOfGoods = qty * buyPrice;

        // 3. Accounting (COGS & Full Revenue split by Tax)
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '5100', creditAccount: '1130', amount: totalCostOfGoods, costCenter: projectName,
            description: `تكلفة مبيعات - صنف ${invItem.item_name} - فاتورة ${saleId}`, username
        });

        // A. Base Revenue (Receivable from Customer)
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1120', creditAccount: '4100', amount: netAmount, costCenter: projectName,
            description: `إيراد مبيعات (أساسي) - العميل ${data.customer_name} - فاتورة ${saleId}`, username
        });

        if (vatAmount > 0) {
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '1120', creditAccount: '2150', amount: vatAmount, costCenter: projectName,
                description: `ضريبة القيمة المضافة (١٤٪) - فاتورة ${saleId}`, username
            });
        }

        if (whtAmount > 0) {
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '1150', creditAccount: '1120', amount: whtAmount, costCenter: projectName,
                description: `ضريبة الخصم من المنبع - فاتورة ${saleId}`, username
            });
        }

        // 4. Handle Hybrid Payment: Wallet Deduction + Down Payment
        
        // A. Execute Wallet Deduction (Debit 2130 - Prepayments, Credit 1120 - Customer AR)
        if (walletDeduction > 0) {
            if (!data.client_id) throw new Error("يجب اختيار عميل مسجل لاستخدام المحفظة.");
            const custRes = await client.query("SELECT credit_balance FROM customers WHERE id = $1 FOR UPDATE", [data.client_id]);
            const availableCredit = parseFloat(custRes.rows[0]?.credit_balance || 0);
            
            if (availableCredit < walletDeduction) {
                throw new Error(`رصيد المحفظة غير كافٍ. المتاح: ${availableCredit}`);
            }

            // Deduct from DB
            await client.query("UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2", [walletDeduction, data.client_id]);
            
            // Record Journal Entry
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '2130', // Liability (Customer Prepayments)
                creditAccount: '1120', // Asset (Customer Receivables)
                amount: walletDeduction, 
                costCenter: projectName,
                description: `تسوية جزء من فاتورة مبيعات ${saleId} خصماً من رصيد المحفظة`, username
            });
            
            await client.query(
                "INSERT INTO client_payment_history (client_id, amount_paid, payment_date, payment_method, reference_no, notes) VALUES ($1, $2, CURRENT_TIMESTAMP, 'Wallet', $3, $4)",
                [data.client_id ? parseInt(data.client_id) : null, walletDeduction, data.reference_no, `سداد من محفظة العميل لفاتورة ${saleId}`]
            );
        }

        // B. Handle Additional Down Payment (Cash/Bank)
        if (downPayment > 0) {
            let paymentAccount = data.payment_method === 'Bank' ? '1111' : '1101';
            let description = `تحصيل دفعة مقدمة إضافية - فاتورة مبيعات ${saleId} - طريقة: ${data.payment_method}`;
            
            // Special Case: Legacy fallback if they chose Wallet but didn't use deduction field
            if (data.payment_method === 'Wallet' && walletDeduction <= 0) {
                const custRes = await client.query("SELECT credit_balance FROM customers WHERE id = $1 FOR UPDATE", [data.client_id]);
                const availableCredit = parseFloat(custRes.rows[0]?.credit_balance || 0);
                if (availableCredit < downPayment) throw new Error(`رصيد المحفظة غير كافٍ. المتاح: ${availableCredit}`);
                await client.query("UPDATE customers SET credit_balance = credit_balance - $1 WHERE id = $2", [downPayment, data.client_id]);
                paymentAccount = '2130';
                description = `خصم من محفظة العميل - فاتورة مبيعات ${saleId}`;
            }

            await AccountingService.recordDoubleEntry(client, {
                debitAccount: paymentAccount, 
                creditAccount: '1120', 
                amount: downPayment, 
                costCenter: projectName,
                description: description, username
            });
            
            await client.query(
                "INSERT INTO client_payment_history (client_id, amount_paid, payment_date, payment_method, reference_no, notes) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)",
                [data.client_id ? parseInt(data.client_id) : null, downPayment, data.payment_method || 'Cash', data.reference_no, `سداد نقدى/بنكى للفاتورة رقم ${saleId}`]
            );
        }

        // 5. Handle Installments (Scheduled Payments)
        if (data.installments && Array.isArray(data.installments)) {
            for (const inst of data.installments) {
                await client.query(
                    "INSERT INTO sale_installments (sale_id, client_id, due_date, amount, notes, payment_method, reference_no) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [saleId, data.client_id ? parseInt(data.client_id) : null, inst.due_date, inst.amount, inst.notes || `قسط فاتورة ${saleId}`, inst.payment_method || 'Cash', inst.reference_no]
                );
                
                await client.query(
                    "INSERT INTO client_delayed_payments (client_id, amount, due_date, status, original_amount, remaining_amount) VALUES ($1, $2, $3, 'Pending', $4, $5)",
                    [data.client_id ? parseInt(data.client_id) : null, inst.amount, inst.due_date, inst.amount, inst.amount]
                );
            }
        }


        await logAudit(username, 'CREATE_SALE', 'inventory_sales', saleId, `Processed sale #${saleId} with balance ${balanceAmount}`);
        
        await checkAndSendLowStockEmail(data.inventory_id).catch(e => console.error(e));
        await client.query('COMMIT');
        res.json({ success: true, message: "تم تسجيل البيع والجدولة بنجاح!", id: saleId });
    } catch (err) {
        await client.query('ROLLBACK');
        const isValidation = err.message.includes('not found') || err.message.includes('processed') || err.message.includes('المخزن');
        res.status(isValidation ? 400 : 500).json({ error: err.message });
    } finally { client.release(); }
};

const addBooking = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';
        const { inventory_id, po_id, customer_name, project_name, qty, sell_price, deposit_amount, payment_method, reference_no } = req.body;

        const q = parseFloat(qty || 0);
        const sp = parseFloat(sell_price || 0);
        const dp = parseFloat(deposit_amount || 0);
        let itemName = 'Unknown Item';

        if (inventory_id) {
            const invRes = await client.query("SELECT * FROM inventory_items WHERE id = $1", [inventory_id]);
            if (invRes.rows.length === 0) throw new Error("Item not found in inventory");
            const invItem = invRes.rows[0];
            itemName = invItem.item_name;

            if (parseFloat(invItem.remaining_qty) < q) throw new Error("Stock insufficient for booking");

            // DEDUCT FROM REMAINING QTY (RESERVE)
            await client.query("UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2", [q, inventory_id]);
        } else if (po_id) {
            const poRes = await client.query("SELECT * FROM purchase_orders WHERE id = $1", [po_id]);
            if (poRes.rows.length === 0) throw new Error("Purchase Order not found");
            itemName = poRes.rows[0].item_description;
            
            // Check if PO has enough qty
            if (parseFloat(poRes.rows[0].qty) < q) throw new Error("PO quantity is less than requested booking quantity.");
        } else {
            throw new Error("Either inventory_id or po_id must be provided for booking.");
        }

        const remaining_amount = (q * sp) - dp;

        const clientId = (req.body.client_id && req.body.client_id !== '') ? parseInt(req.body.client_id) : null;

        const history = [{ date: new Date(), amount: dp, type: 'Initial Booking' }];
        const bookingRes = await client.query(
            "INSERT INTO inventory_bookings (inventory_id, po_id, customer_name, client_id, project_name, qty, uom, sell_price, deposit_amount, remaining_amount, payment_method, reference_no, created_by, expiry_date, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id",
            [inventory_id || null, po_id || null, customer_name, clientId, project_name || 'General', q, req.body.uom || (inventory_id ? itemName : null), sp, dp, remaining_amount, payment_method || 'Cash', reference_no, username, req.body.expiry_date || null, JSON.stringify({ history })]
        );
        const bookingId = bookingRes.rows[0].id;

        // 2. Accounting for Deposit
        if (parseFloat(deposit_amount) > 0) {
            const creditAcc = req.body.credit_account || '1101'; // Fallback to Cash
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: creditAcc, creditAccount: '2130', amount: deposit_amount, costCenter: project_name,
                description: `دفعة مقدمة لحجز بضاعة - العميل ${customer_name} - حجز ${bookingId}`, username
            });
        }

        await logAudit(username, 'CREATE_BOOKING', 'inventory_bookings', bookingId, `Reserved ${q} of ${itemName} (Type: ${inventory_id ? 'In-Stock' : 'Pre-Delivery'})`);
        await client.query('COMMIT');
        res.json({ success: true, booking_id: bookingId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[ADD_BOOKING ERROR]:", err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
};

const completeBooking = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';
        const bookingId = req.params.id;

        const bookingRes = await client.query("SELECT * FROM inventory_bookings WHERE id = $1", [bookingId]);
        if (bookingRes.rows.length === 0) throw new Error("Booking not found");
        const booking = bookingRes.rows[0];
        if (booking.status !== 'Pending') throw new Error("Booking is already processed");
        if (!booking.inventory_id) throw new Error("البضاعة لم تدخل المخزن بعد. يرجى استلام أمر الشراء أولاً.");

        const invRes = await client.query("SELECT * FROM inventory_items WHERE id = $1", [booking.inventory_id]);
        const invItem = invRes.rows[0];

        // 1. DEDUCT FROM TOTAL QUANTITY (Actually, we just keep remaining_qty reduced. 
        // No deduction from 'quantity' because it's static principal balance.)
        // We already deducted from remaining_qty during booking.

        const qty = parseFloat(booking.qty || 0);
        const sellPrice = parseFloat(booking.sell_price || 0);
        const buyPrice = parseFloat(invItem.avg_cost || invItem.buy_price || 0);
        
        const netAmount = qty * sellPrice;
        const deposit = parseFloat(booking.deposit_amount || 0);
        const totalRevenue = netAmount; // Assuming no extra VAT/WHT on booking completion yet
        const totalCost = qty * buyPrice;

        const saleRes = await client.query(
            "INSERT INTO inventory_sales (inventory_id, date, customer_name, client_id, project_name, item_name, qty, uom, buy_price, sell_price, created_by, total_amount, paid_amount, balance_amount, net_amount, payment_method, reference_no) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id",
            [booking.inventory_id, booking.booking_date || new Date(), booking.customer_name, booking.client_id, booking.project_name, invItem.item_name, qty, booking.uom || invItem.uom, buyPrice, sellPrice, username, totalRevenue, deposit, (totalRevenue - deposit), netAmount, booking.payment_method || 'Cash', booking.reference_no || `BOOK-${bookingId}`]
        );
        const saleId = saleRes.rows[0].id;

        // 2. Accounting
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '5100', creditAccount: '1130', amount: totalCost, costCenter: booking.project_name,
            description: `تكلفة مبيعات (من حجز ${bookingId}) - فاتورة ${saleId}`, username
        });

        await AccountingService.recordDoubleEntry(client, {
            debitAccount: '1120', creditAccount: '4100', amount: totalRevenue, costCenter: booking.project_name,
            description: `إيراد مبيعات (من حجز ${bookingId}) - فاتورة ${saleId}`, username
        });

        if (deposit > 0) {
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '2130', creditAccount: '1120', amount: deposit, costCenter: booking.project_name,
                description: `تسوية الدفعة المقدمة لحجز ${bookingId} مقابل فاتورة ${saleId}`, username
            });
        }

        const logEntry = { date: new Date(), type: 'Fulfillment' };
        await client.query(
            `UPDATE inventory_bookings 
             SET status = 'Completed', 
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{history}', COALESCE(metadata->'history', '[]'::jsonb) || $1::jsonb) 
             WHERE id = $2`, 
            [JSON.stringify(logEntry), bookingId]
        );
        await logAudit(username, 'COMPLETE_BOOKING', 'inventory_bookings', bookingId, `Completed booking into sale #${saleId}`);

        await client.query('COMMIT');
        res.json({ success: true, sale_id: saleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[COMPLETE_BOOKING ERROR]:', err);
        // Check for common validation errors to return 400 instead of 500
        const isVal = err.message.includes('not found') || err.message.includes('processed') || /[؀-ۿ]/.test(err.message);
        res.status(isVal ? 400 : 500).json({ error: err.message });
    } finally { client.release(); }
};

const refundBooking = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { credit_account, amount, reference_no } = req.body;
        const username = req.user ? req.user.username : 'System';

        const bookRes = await client.query("SELECT * FROM inventory_bookings WHERE id = $1", [id]);
        if (bookRes.rows.length === 0) throw new Error("Booking not found");
        const booking = bookRes.rows[0];

        const refundAmt = parseFloat(amount || 0);
        if (refundAmt <= 0) throw new Error("Invalid refund amount");

        // Accounting: Debit Prepayments (2130), Credit Bank/Cash (Selected Account)
        const revRes = await AccountingService.recordDoubleEntry(client, {
            debitAccount: '2130',
            creditAccount: credit_account || '1101',
            amount: refundAmt,
            costCenter: booking.project_name,
            description: `استرداد فائض حجز رقم ${id} للعميل ${booking.customer_name}`,
            username,
            referenceNo: reference_no,
            sourceModule: 'Inventory'
        });

        // Update booking (reduce deposit_amount)
        const logEntry = { date: new Date(), amount: refundAmt, type: 'Refund', ref: reference_no };
        await client.query(
            `UPDATE inventory_bookings 
             SET deposit_amount = deposit_amount - $1, 
                 remaining_amount = remaining_amount + $1, 
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{history}', COALESCE(metadata->'history', '[]'::jsonb) || $2::jsonb) 
             WHERE id = $3`,
            [refundAmt, JSON.stringify(logEntry), id]
        );

        await logAdvancedAudit(client, username, 'inventory_bookings', id, 'REFUND', `Refunded ${refundAmt} for booking #${id} via ${credit_account}. Journal Entry #${revRes?.debitId || 'N/A'}`, booking, null);
        await client.query('COMMIT');
        res.json({ success: true, message: "تمت عملية الاسترداد بنجاح مع تسجيل التدقيق الأمني." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Refund Booking Error:", err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
};

const transferBookingToBalance = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { amount } = req.body;
        const username = req.user ? req.user.username : 'System';

        const bookRes = await client.query("SELECT * FROM inventory_bookings WHERE id = $1", [id]);
        if (bookRes.rows.length === 0) throw new Error("Booking not found");
        const booking = bookRes.rows[0];
        if (!booking.client_id) throw new Error("لا يمكن تحويل الرصيد لعميل غير مسجل (Cash Customer). يرجى ربط العميل أولاً.");

        const transferAmt = parseFloat(amount || 0);
        if (transferAmt <= 0) throw new Error("Invalid transfer amount");

        // 1. Update Customer Credit Balance in master record
        await client.query("UPDATE customers SET credit_balance = COALESCE(credit_balance, 0) + $1 WHERE id = $2", [transferAmt, booking.client_id]);

        // 2. Reduce Booking Deposit and update remaining amount
        const logEntry = { date: new Date(), amount: transferAmt, type: 'TransferToGeneral' };
        await client.query(
            `UPDATE inventory_bookings 
             SET deposit_amount = deposit_amount - $1, 
                 remaining_amount = remaining_amount + $1, 
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{history}', COALESCE(metadata->'history', '[]'::jsonb) || $2::jsonb) 
             WHERE id = $3`,
            [transferAmt, JSON.stringify(logEntry), id]
        );

        // 3. Log Audit
        await logAdvancedAudit(client, username, 'inventory_bookings', id, 'REFUND', `Transferred ${transferAmt} from booking #${id} to customer #${booking.client_id} general balance`, booking, null);
        
        await client.query('COMMIT');
        res.json({ success: true, message: "تم تحويل الرصيد لمحفظة العميل بنجاح مع تسجيل التدقيق الأمني." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Transfer Booking Error:", err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
};

// =====================================================================
// --- STOCK RETURNS MODULE ---
// =====================================================================

const getStockReturns = async (req, res) => {
    try {
        const { type, inventory_id } = req.query;
        let sql = `
            SELECT sr.*, 
                   ii.item_name, ii.warehouse,
                   s.customer_name AS sale_customer,
                   s.date AS sale_date
            FROM stock_returns sr
            LEFT JOIN inventory_items ii ON sr.inventory_id = ii.id
            LEFT JOIN inventory_sales  s  ON sr.source_sale_id = s.id
            WHERE sr.is_deleted = FALSE
        `;
        const params = [];
        if (type) { params.push(type); sql += ` AND sr.return_type = $${params.length}`; }
        if (inventory_id) { params.push(inventory_id); sql += ` AND sr.inventory_id = $${params.length}`; }
        sql += ' ORDER BY sr.created_at DESC';
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Get Stock Returns Error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * مرتجع عميل — العميل يُعيد بضاعة للمخزن
 * القيود:
 *   مدين  4100 إيراد مبيعات    ← قيمة البيع
 *   دائن  1120 عملاء (AR)      ← إشعار دائن / أو تُضاف لمحفظة العميل
 *   مدين  1130 مخزون           ← إعادة بالتكلفة
 *   دائن  5100 تكلفة مبيعات    ← عكس COGS
 */
const addCustomerReturn = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';
        const {
            inventory_id, source_sale_id, return_qty,
            reason, reason_code, notes,
            customer_name, client_id, project_name,
            refund_method, credit_account
        } = req.body;

        const qty = parseFloat(return_qty || 0);
        if (!inventory_id || qty <= 0) throw new Error('البيانات المطلوبة: الصنف والكمية.');

        // 1. Fetch inventory item
        const invRes = await client.query('SELECT * FROM inventory_items WHERE id = $1', [inventory_id]);
        if (invRes.rows.length === 0) throw new Error('الصنف غير موجود.');
        const inv = invRes.rows[0];

        // 2. Fetch original sale for prices (optional link)
        let returnPrice = parseFloat(req.body.return_price || 0);
        let costPrice   = parseFloat(inv.avg_cost || inv.buy_price || 0);

        if (source_sale_id) {
            const saleRes = await client.query('SELECT * FROM inventory_sales WHERE id = $1', [source_sale_id]);
            if (saleRes.rows.length > 0) {
                const sale = saleRes.rows[0];
                if (returnPrice === 0) returnPrice = parseFloat(sale.sell_price || 0);
                if (costPrice   === 0) costPrice   = parseFloat(sale.buy_price  || inv.avg_cost || 0);
                // Validate: return qty must not exceed original sale qty
                if (qty > parseFloat(sale.qty || 0)) {
                    throw new Error(`كمية المرتجع (${qty}) تتجاوز كمية الفاتورة الأصلية (${sale.qty}).`);
                }
            }
        }

        const totalReturnValue = qty * returnPrice;
        const totalCostValue   = qty * costPrice;
        const projectCost      = project_name || inv.project_name || 'General';

        // Generate return number
        const returnNo = `SR-C-${Date.now()}`;

        // 3. Return item to inventory
        await client.query(
            'UPDATE inventory_items SET remaining_qty = remaining_qty + $1 WHERE id = $2',
            [qty, inventory_id]
        );

        // 4. Record in stock_returns
        const returnRes = await client.query(
            `INSERT INTO stock_returns 
             (return_no, return_type, source_sale_id, inventory_id, return_qty, return_price, cost_price, 
              reason, reason_code, status, customer_name, project_name, refund_method, credit_account, notes, created_by)
             VALUES ($1,'customer',$2,$3,$4,$5,$6,$7,$8,'Approved',$9,$10,$11,$12,$13,$14) RETURNING id`,
            [returnNo, source_sale_id || null, inventory_id, qty, returnPrice, costPrice,
             reason || 'غير محدد', reason_code || 'OTHER',
             customer_name || 'Unknown', projectCost,
             refund_method || 'Credit', credit_account || '1120', notes || '', username]
        );
        const returnId = returnRes.rows[0].id;

        // 5. Double-entry: Reverse Revenue
        if (totalReturnValue > 0) {
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '4100', creditAccount: '1120',
                amount: totalReturnValue, costCenter: projectCost,
                description: `مرتجع عميل #${returnNo} — عكس إيراد مبيعات | الصنف: ${inv.item_name} | كمية: ${qty}`,
                username
            });
        }

        // 6. Double-entry: Reverse COGS (return to inventory)
        if (totalCostValue > 0) {
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '1130', creditAccount: '5100',
                amount: totalCostValue, costCenter: projectCost,
                description: `مرتجع عميل #${returnNo} — إعادة بضاعة للمخزن | التكلفة: ${costPrice} × ${qty}`,
                username
            });
        }

        // 7. If refund goes to customer wallet — add credit_balance
        if (refund_method === 'Credit' && client_id) {
            await client.query(
                'UPDATE customers SET credit_balance = COALESCE(credit_balance, 0) + $1 WHERE id = $2',
                [totalReturnValue, client_id]
            );
        }

        await logAudit(username, 'CUSTOMER_RETURN', 'stock_returns', returnId,
            `مرتجع عميل ${returnNo}: ${qty} وحدة من "${inv.item_name}" — قيمة: ${totalReturnValue}`);
        await client.query('COMMIT');
        res.json({ success: true, message: 'تم تسجيل مرتجع العميل بنجاح وتحديث المخزن.', return_no: returnNo, id: returnId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Customer Return Error:', err);
        res.status(400).json({ error: err.message });
    } finally { client.release(); }
};

/**
 * مرتجع مورد — المخزن يُعيد بضاعة للمورد
 * القيود:
 *   مدين  2110 موردون (AP)   ← إشعار مدين للمورد
 *   دائن  1130 مخزون         ← خروج البضاعة بالتكلفة
 */
const addSupplierReturn = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const username = req.user ? req.user.username : 'System';
        const {
            inventory_id, source_po_id, return_qty,
            reason, reason_code, notes,
            supplier_name, project_name
        } = req.body;

        const qty = parseFloat(return_qty || 0);
        if (!inventory_id || qty <= 0) throw new Error('البيانات المطلوبة: الصنف والكمية.');

        // 1. Fetch inventory item
        const invRes = await client.query('SELECT * FROM inventory_items WHERE id = $1', [inventory_id]);
        if (invRes.rows.length === 0) throw new Error('الصنف غير موجود.');
        const inv = invRes.rows[0];

        if (parseFloat(inv.remaining_qty) < qty) {
            throw new Error(`الكمية المتاحة غير كافية للإرجاع. المتاح: ${inv.remaining_qty}`);
        }

        const costPrice       = parseFloat(inv.avg_cost || inv.buy_price || 0);
        const totalCostValue  = qty * costPrice;
        const projectCost     = project_name || inv.project_name || 'General';
        const returnNo        = `SR-S-${Date.now()}`;

        // 2. Deduct from inventory
        await client.query(
            'UPDATE inventory_items SET remaining_qty = remaining_qty - $1 WHERE id = $2',
            [qty, inventory_id]
        );

        // 3. Record in stock_returns
        const returnRes = await client.query(
            `INSERT INTO stock_returns 
             (return_no, return_type, source_po_id, inventory_id, return_qty, cost_price,
              reason, reason_code, status, supplier_name, project_name, notes, created_by)
             VALUES ($1,'supplier',$2,$3,$4,$5,$6,$7,'Approved',$8,$9,$10,$11) RETURNING id`,
            [returnNo, source_po_id || null, inventory_id, qty, costPrice,
             reason || 'غير محدد', reason_code || 'OTHER',
             supplier_name || 'Unknown', projectCost, notes || '', username]
        );
        const returnId = returnRes.rows[0].id;

        // 4. Double-entry: Debit AP, Credit Inventory
        if (totalCostValue > 0) {
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: '2110', creditAccount: '1130',
                amount: totalCostValue, costCenter: projectCost,
                description: `مرتجع مورد #${returnNo} — إعادة للمورد ${supplier_name} | الصنف: ${inv.item_name} | كمية: ${qty}`,
                username
            });
        }

        await logAudit(username, 'SUPPLIER_RETURN', 'stock_returns', returnId,
            `مرتجع مورد ${returnNo}: ${qty} وحدة من "${inv.item_name}" — تكلفة: ${totalCostValue}`);
        await client.query('COMMIT');
        res.json({ success: true, message: 'تم تسجيل المرتجع للمورد بنجاح وتحديث المخزن.', return_no: returnNo, id: returnId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Supplier Return Error:', err);
        res.status(400).json({ error: err.message });
    } finally { client.release(); }
};

module.exports = { addSale, addBooking, completeBooking, refundBooking, transferBookingToBalance, getStockReturns, addCustomerReturn, addSupplierReturn };
