const pool = require('../config/db');
const { logAudit } = require('../utils/helpers');

class CustomerController {
    async getClient360(req, res) {
        try {
            const clientId = req.params.client_id;

            // 1. Profile Data
            const clientRes = await pool.query("SELECT id, name, company_name, phone, email, credit_limit, credit_balance, customer_since, status FROM customers WHERE id = $1", [clientId]);
            if (clientRes.rows.length === 0) return res.status(404).json({ error: "العميل غير موجود" });
            const clientData = clientRes.rows[0];

            // 2. Comprehensive Financial Summary
            const statsRes = await pool.query(`
                SELECT 
                    (SELECT COALESCE(SUM(total_revenue), 0) FROM client_consumptions WHERE client_id = $1) as std_sales,
                    (SELECT COALESCE(SUM(total_price), 0) FROM real_estate_contracts WHERE customer_id = $1) as re_sales,
                    (SELECT COALESCE(SUM(total_amount), 0) FROM ar_invoices WHERE client_name = $2) as ar_sales,
                    (SELECT COALESCE(SUM(qty * sell_price), 0) FROM inventory_sales WHERE (client_id = $1 OR customer_name = $2)) as inv_sales,
                    (SELECT COALESCE(SUM(amount_paid), 0) FROM client_payment_history WHERE client_id = $1) as total_payments,
                    (SELECT COALESCE(SUM(amount), 0) FROM real_estate_installments i JOIN real_estate_contracts c ON i.contract_id = c.id WHERE c.customer_id = $1 AND i.status = 'Paid') as re_paid,
                    (SELECT COALESCE(SUM(deposit_amount), 0) FROM inventory_bookings WHERE (client_id = $1 OR customer_name = $2)) as inv_deposits,
                    (SELECT COALESCE(SUM(amount), 0) FROM client_refunds WHERE client_id = $1) as refunds
            `, [clientId, clientData.name]);

            const rawStats = statsRes.rows[0];
            
            // Segmented Calculations
            const invDue = (parseFloat(rawStats.inv_sales) + parseFloat(rawStats.std_sales)) - parseFloat(rawStats.inv_deposits);
            const reDue = parseFloat(rawStats.re_sales) - parseFloat(rawStats.re_paid);
            const finDue = parseFloat(rawStats.ar_sales) - (parseFloat(rawStats.total_payments) - parseFloat(rawStats.refunds));

            const stats = {
                total_sales: parseFloat(rawStats.std_sales) + parseFloat(rawStats.re_sales) + parseFloat(rawStats.ar_sales) + parseFloat(rawStats.inv_sales),
                total_paid: parseFloat(rawStats.total_payments) + parseFloat(rawStats.re_paid) + parseFloat(rawStats.inv_deposits) - parseFloat(rawStats.refunds),
                total_due: (parseFloat(rawStats.std_sales) + parseFloat(rawStats.re_sales) + parseFloat(rawStats.ar_sales) + parseFloat(rawStats.inv_sales)) - (parseFloat(rawStats.total_payments) + parseFloat(rawStats.re_paid) + parseFloat(rawStats.inv_deposits) - parseFloat(rawStats.refunds)),
                segmented: {
                    inventory: invDue,
                    real_estate: reDue,
                    finance: finDue
                }
            };

            // 3. Combined Aging Report
            const agingRes = await pool.query(`
                WITH combined_debts AS (
                    SELECT amount, due_date FROM client_delayed_payments WHERE client_id = $1 AND status != 'Paid'
                    UNION ALL
                    SELECT i.amount, i.due_date 
                    FROM real_estate_installments i 
                    JOIN real_estate_contracts c ON i.contract_id = c.id 
                    WHERE c.customer_id = $1 AND i.status != 'Paid'
                    UNION ALL
                    SELECT (qty * sell_price) as amount, date as due_date
                    FROM inventory_sales 
                    WHERE (client_id = $1 OR customer_name = $2) AND payment_method = 'Credit'
                )
                SELECT 
                    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN amount ELSE 0 END), 0) as not_due,
                    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND CURRENT_DATE - due_date <= 30 THEN amount ELSE 0 END), 0) as days_1_30,
                    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND CURRENT_DATE - due_date > 30 AND CURRENT_DATE - due_date <= 60 THEN amount ELSE 0 END), 0) as days_31_60,
                    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND CURRENT_DATE - due_date > 60 AND CURRENT_DATE - due_date <= 90 THEN amount ELSE 0 END), 0) as days_61_90,
                    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND CURRENT_DATE - due_date > 90 THEN amount ELSE 0 END), 0) as days_over_90
                FROM combined_debts
            `, [clientId, clientData.name]);

            const aging = agingRes.rows[0];

            res.json({
                success: true,
                profile: clientData,
                stats: stats,
                aging: aging
            });
        } catch (error) {
            console.error("[API ERROR] getClient360:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getInteractions(req, res) {
        try {
            const clientId = req.params.client_id;
            const result = await pool.query("SELECT * FROM client_interactions WHERE client_id = $1 ORDER BY interaction_date DESC", [clientId]);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addInteraction(req, res) {
        try {
            const { client_id, type, summary, next_follow_up } = req.body;
            await pool.query(
                "INSERT INTO client_interactions (client_id, type, summary, created_by, next_follow_up) VALUES ($1, $2, $3, $4, $5)",
                [client_id, type, summary, req.user.username, next_follow_up || null]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async payDelayedBalance(req, res) {
        const { client_id, amount_paid, payment_method, reference_no, notes } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const username = req.user.username;

            // 1. Record General Payment History
            const payRes = await client.query(
                "INSERT INTO client_payment_history (client_id, amount_paid, payment_date, payment_method, reference_no, notes) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) RETURNING id",
                [client_id, amount_paid, payment_method, reference_no, notes]
            );
            const paymentId = payRes.rows[0].id;

            // 2. Allocation to debts (FIFO)
            let remaining = parseFloat(amount_paid);
            const debts = await client.query("SELECT id, amount FROM client_delayed_payments WHERE client_id = $1 AND status = 'Pending' ORDER BY due_date ASC", [client_id]);

            for (let debt of debts.rows) {
                if (remaining <= 0) break;
                const debtAmt = parseFloat(debt.amount);
                const allocated = Math.min(remaining, debtAmt);

                await client.query("INSERT INTO payment_allocations (payment_id, debt_id, allocated_amount) VALUES ($1, $2, $3)", [paymentId, debt.id, allocated]);
                await client.query("UPDATE client_delayed_payments SET amount = amount - $1, status = CASE WHEN amount - $1 <= 0 THEN 'Paid' ELSE 'Pending' END WHERE id = $2", [allocated, debt.id]);

                remaining -= allocated;
            }

            await logAudit(username, 'CLIENT_PAYMENT', 'customers', client_id, `Received payment ${amount_paid} from client ${client_id}`);
            await client.query('COMMIT');
            res.json({ success: true, message: "تم تسجيل السداد وتوزيعه بنجاح" });
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    async getClientStatement(req, res) {
        try {
            const clientId = req.params.client_id;
            const { module } = req.query; // Filter: General, RealEstate, Projects
            
            const clientRes = await pool.query("SELECT name, COALESCE(credit_balance, 0) as opening_balance, customer_since FROM customers WHERE id = $1", [clientId]);
            if (clientRes.rows.length === 0) return res.status(404).json({ error: "العميل غير موجود" });
            const { name: clientName, opening_balance, customer_since } = clientRes.rows[0];

            let statementParts = [];

            // 0. Include Global Opening Balance ONLY for the "All Modules" view
            if (!module) {
                statementParts.push({ 
                    id: 0, date: customer_since || '2020-01-01', 
                    debit: parseFloat(opening_balance) >= 0 ? Math.abs(opening_balance) : 0, 
                    credit: parseFloat(opening_balance) < 0 ? Math.abs(opening_balance) : 0, 
                    description: 'رصيد افتتاحي (إجمالي)', source_module: 'System'
                });
            }

            // 1. Projects / Inventory
            if (!module || module === 'Projects') {
                const invRes = await pool.query(`
                    SELECT id, outstanding_date as date, total_revenue as debit, 0 as credit, 
                        'فاتورة/استهلاك ' || COALESCE((SELECT item_name FROM inventory_items WHERE id = inventory_id), 'رصيد') as description, 'Inventory' as source_module
                    FROM client_consumptions WHERE client_id = $1
                    UNION ALL
                    SELECT id, date, (qty * sell_price) as debit, 0 as credit,
                        'بيع صنف: ' || item_name || ' (عدد ' || qty || ')' as description, 'Inventory' as source_module
                    FROM inventory_sales WHERE (client_id = $1 OR customer_name = $2)
                    UNION ALL
                    SELECT id, CAST(booking_date AS DATE) as date, 0 as debit, deposit_amount as credit,
                        'عربون حجز صنف' as description, 'Inventory' as source_module
                    FROM inventory_bookings WHERE (client_id = $1 OR customer_name = $2) AND deposit_amount > 0
                `, [clientId, clientName]);
                statementParts.push(...invRes.rows);
            }

            // 2. Real Estate
            if (!module || module === 'RealEstate') {
                const reRes = await pool.query(`
                    SELECT id, contract_date as date, total_price as debit, 0 as credit,
                        'تعاقد وحدة ' || COALESCE((SELECT unit_number FROM real_estate_units WHERE id = unit_id), 'عقارية') as description, 'Real Estate' as source_module
                    FROM real_estate_contracts WHERE customer_id = $1
                    UNION ALL
                    SELECT inst.id, inst.paid_date as date, 0 as debit, inst.amount as credit,
                        'سداد قسط عقاري - عقد رقم ' || c.id as description, 'Real Estate' as source_module
                    FROM real_estate_installments inst
                    JOIN real_estate_contracts c ON inst.contract_id = c.id
                    WHERE c.customer_id = $1 AND inst.status = 'Paid'
                `, [clientId]);
                statementParts.push(...reRes.rows);
            }

            // 3. General / Finance
            if (!module || module === 'General') {
                const finRes = await pool.query(`
                    SELECT id, date, total_amount as debit, 0 as credit, 'فاتورة عامة رقم ' || id as description, 'Finance' as source_module
                    FROM ar_invoices WHERE client_name = $1
                    UNION ALL
                    SELECT id, payment_date as date, 0 as debit, amount_paid as credit,
                        'سداد مالي - ' || payment_method || ' ' || COALESCE(reference_no, '') as description, 'Payment' as source_module
                    FROM client_payment_history WHERE client_id = $2
                    UNION ALL
                    SELECT id, date, amount as debit, 0 as credit, 'رد مبلغ للعميل - ' || method as description, 'Refund' as source_module
                    FROM client_refunds WHERE client_id = $2
                `, [clientName, clientId]);
                statementParts.push(...finRes.rows);
            }

            let statement = statementParts.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);

            let runningBalance = 0;
            statement = statement.map(item => {
                runningBalance += (parseFloat(item.debit) - parseFloat(item.credit));
                return { ...item, running_balance: runningBalance, created_at: item.date };
            });

            res.json({ success: true, statement: statement });
        } catch (error) {
            console.error("[API ERROR] getClientStatement:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAllClientBalances(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    c.id, c.name, c.company_name, c.phone, c.email,
                    COALESCE((
                        SELECT SUM(l.debit - l.credit) 
                        FROM ledger l 
                        JOIN chart_of_accounts coa ON TRIM(l.account_name) = TRIM(coa.account_name)
                        WHERE coa.account_code LIKE '112%' AND TRIM(l.account_name) LIKE '%' || TRIM(c.name) || '%'
                    ), (
                        COALESCE((SELECT SUM(total_revenue) FROM client_consumptions WHERE client_id = c.id), 0) + 
                        COALESCE((SELECT SUM(total_price) FROM real_estate_contracts WHERE customer_id = c.id), 0) + 
                        COALESCE((SELECT SUM(total_amount) FROM ar_invoices WHERE client_name = c.name), 0) + 
                        COALESCE((SELECT SUM(qty * sell_price) FROM inventory_sales WHERE client_id = c.id OR customer_name = c.name), 0)
                    ) - (
                        COALESCE((SELECT SUM(amount_paid) FROM client_payment_history WHERE client_id = c.id), 0) + 
                        COALESCE((SELECT SUM(amount) FROM real_estate_installments i JOIN real_estate_contracts rec ON i.contract_id = rec.id WHERE rec.customer_id = c.id AND i.status = 'Paid'), 0) + 
                        COALESCE((SELECT SUM(deposit_amount) FROM inventory_bookings WHERE client_id = c.id OR customer_name = c.name), 0) -
                        COALESCE((SELECT SUM(amount) FROM client_refunds WHERE client_id = c.id), 0)
                    )) as balance
                FROM customers c
                ORDER BY balance DESC
            `);
            
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error("[API ERROR] getAllClientBalances:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CustomerController();
