const pool = require('../config/db');
const eInvoicingService = require('../services/eInvoicingService');

/**
 * Submit invoice to Tax Portal
 */
const submitInvoice = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');

        let invoice = null;
        let isSalesInvoice = false;

        // Try sales_invoices first
        let invRes = await client.query('SELECT * FROM sales_invoices WHERE id = $1', [id]);
        if (invRes.rows.length > 0) {
            invoice = invRes.rows[0];
            isSalesInvoice = true;
            invoice.invoice_no = invoice.invoice_number;
            invoice.subtotal = Number(invoice.total_amount) - Number(invoice.tax_amount || 0) + Number(invoice.discount || 0);
        } else {
            invRes = await client.query('SELECT * FROM ar_invoices WHERE id = $1', [id]);
            if (invRes.rows.length > 0) {
                invoice = invRes.rows[0];
            }
        }

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found in sales or AR records.' });
        }

        // 2. Fetch Invoice Items
        let items = [];
        if (isSalesInvoice) {
            items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
        } else {
            const itemsRes = await client.query('SELECT * FROM ar_invoice_items WHERE invoice_id = $1', [id]);
            items = itemsRes.rows;
        }

        // 3. Fetch Customer Details
        const custRes = await client.query('SELECT * FROM customers WHERE id = $1', [invoice.client_id || invoice.customer_id]);
        if (custRes.rows.length === 0) {
            return res.status(404).json({ error: 'Associated customer details not found.' });
        }
        const customer = custRes.rows[0];

        // 4. Fetch Company Settings
        const settingsRes = await client.query("SELECT value FROM settings WHERE key = 'company_profile' LIMIT 1");
        const companySettings = settingsRes.rows[0]?.value || {};

        // 5. Serialize, Sign, and Submit
        const serialized = eInvoicingService.serializeInvoice(invoice, items, customer, companySettings);
        const signed = eInvoicingService.signDocument(serialized);
        
        const token = await eInvoicingService.getAccessToken();
        const portalRes = await eInvoicingService.submitSignedDocument(signed, token);

        let uuid = '';
        let status = 'Failed';
        let errors = null;

        if (portalRes.acceptedDocuments && portalRes.acceptedDocuments.length > 0) {
            uuid = portalRes.acceptedDocuments[0].uuid;
            status = 'Submitted';
        } else if (portalRes.rejectedDocuments && portalRes.rejectedDocuments.length > 0) {
            errors = portalRes.rejectedDocuments[0].error || portalRes.rejectedDocuments;
            status = 'Rejected';
        }

        // 6. Update Invoice in database
        const targetTable = isSalesInvoice ? 'sales_invoices' : 'ar_invoices';
        await client.query(`
            UPDATE ${targetTable} 
            SET einvoice_uuid = $1, einvoice_status = $2, einvoice_submission_date = CURRENT_TIMESTAMP, einvoice_errors = $3
            WHERE id = $4
        `, [uuid, status, errors ? JSON.stringify(errors) : null, id]);

        await client.query('COMMIT');
        res.json({ success: true, uuid, status, errors });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[E-INVOICE SUBMIT CONTROLLER ERROR]', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

/**
 * Check Portal Validation Status (Synchronizes status)
 */
const checkInvoicePortalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        let invRes = await pool.query('SELECT einvoice_uuid, einvoice_status FROM sales_invoices WHERE id = $1', [id]);
        let targetTable = 'sales_invoices';
        if (invRes.rows.length === 0) {
            invRes = await pool.query('SELECT einvoice_uuid, einvoice_status FROM ar_invoices WHERE id = $1', [id]);
            targetTable = 'ar_invoices';
        }
        
        if (invRes.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }
        
        const { einvoice_uuid, einvoice_status } = invRes.rows[0];
        
        if (!einvoice_uuid) {
            return res.json({ status: einvoice_status, message: 'Document not submitted to tax portal yet.' });
        }

        // Simulating Status Verification API Call
        let newStatus = einvoice_status;
        if (einvoice_status === 'Submitted') {
            newStatus = 'Valid'; // Simulate valid processing after submission
            await pool.query(`UPDATE ${targetTable} SET einvoice_status = $1 WHERE id = $2`, [newStatus, id]);
        }

        res.json({ success: true, uuid: einvoice_uuid, status: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { submitInvoice, checkInvoicePortalStatus };
