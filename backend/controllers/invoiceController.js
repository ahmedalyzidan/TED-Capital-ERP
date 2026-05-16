const pool = require('../config/db');
const AccountingService = require('../services/accountingService');

/**
 * Enterprise Invoice Controller
 */

const createInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            invoice_no, client_id, project_id, issue_date, due_date, 
            items, tax_amount, notes, source_module 
        } = req.body;

        // 1. Calculate Totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total_amount = Number(subtotal) + Number(tax_amount || 0);

        // 2. Insert Header
        const headerRes = await client.query(
            `INSERT INTO ar_invoices (invoice_no, client_id, project_id, issue_date, due_date, subtotal, tax_amount, total_amount, notes, source_module, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [invoice_no, client_id, project_id, issue_date, due_date, subtotal, tax_amount, total_amount, notes, source_module || 'General', req.user.username]
        );
        const invoiceId = headerRes.rows[0].id;

        // 3. Insert Items
        for (const item of items) {
            await client.query(
                `INSERT INTO ar_invoice_items (invoice_id, description, quantity, unit_price, total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        // 4. Generate GL Entry (Double Entry)
        const mapping = await AccountingService.getMapping(client, 'CUSTOMER_INVOICE');
        await AccountingService.recordDoubleEntry(client, {
            debitAccount: mapping?.debit_account || '1120', 
            creditAccount: mapping?.credit_account || '4100',
            amount: total_amount,
            costCenter: project_id ? `Project-${project_id}` : 'General',
            description: `فاتورة مبيعات رقم: ${invoice_no}`,
            username: req.user.username,
            referenceNo: invoice_no,
            clientId: client_id,
            sourceModule: source_module || 'General'
        });

        await client.query('COMMIT');
        res.json({ success: true, invoiceId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const getClientStatement = async (req, res) => {
    try {
        const { client_id } = req.params;
        const { module } = req.query; // Optional module filter

        let query = `
            SELECT l.*, c.name as client_name
            FROM ledger l
            JOIN customers c ON l.client_id = c.id
            WHERE l.client_id = $1
        `;
        const params = [client_id];

        if (module) {
            query += ` AND l.source_module = $2`;
            params.push(module);
        }

        query += ` ORDER BY l.created_at ASC`;

        const result = await pool.query(query, params);
        
        // Calculate Running Balance
        let balance = 0;
        const statement = result.rows.map(row => {
            balance += (Number(row.debit) - Number(row.credit));
            return { ...row, running_balance: balance };
        });

        res.json({ statement });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { createInvoice, getClientStatement };
