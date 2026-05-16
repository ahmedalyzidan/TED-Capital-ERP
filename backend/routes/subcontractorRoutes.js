const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');
const { logAdvancedAudit, autoLedgerEntry } = require('../utils/helpers');

// محاكاة مؤقتة للمحركات لحين استكمالها بالكامل
let processApprovalWorkflow = async () => ({ newStatus: 'اعتماد مالي', isFinalApproval: true });
let dispatchWebhook = () => {};
try {
    processApprovalWorkflow = require('../services/workflowEngine').processApprovalWorkflow;
    dispatchWebhook = require('../services/webhookDispatcher').dispatchWebhook;
} catch (e) {}

router.use(authenticateToken);

router.post('/approve_invoice/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const invoiceId = req.params.id;
        const { action, username } = req.body; 
        const userRole = req.user ? req.user.role : 'Unknown';

        const invRes = await client.query("SELECT * FROM subcontractor_invoices WHERE id = $1", [invoiceId]);
        if (invRes.rows.length === 0) throw new Error("Invoice not found.");
        const invoice = invRes.rows[0];

        const workflowResult = await processApprovalWorkflow('subcontractor_invoices', invoice, action, userRole, parseFloat(invoice.net_amount));
        const newStatus = workflowResult.newStatus;

        if (workflowResult.isFinalApproval) {
            const netAmount = parseFloat(invoice.net_amount);
            const projectName = invoice.project_name || 'General';
            const desc = `اعتماد مستخلص مقاول باطن رقم #${invoiceId} - ${invoice.description}`;
            
            // استدعاء الخدمة المحاسبية المعيارية (Standardized Accounting Integration)
            const AccountingService = require('../services/accountingService');
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: 'تكلفة مقاولي الباطن',
                creditAccount: 'مقاولي الباطن',
                amount: netAmount,
                costCenter: projectName,
                description: desc,
                username: username
            });
            
            // تحديث كميات الـ BOQ (Update bill of quantities)
            if (invoice.sub_item_id) {
                await client.query(
                    "UPDATE boq SET dynamic_act_qty = COALESCE(dynamic_act_qty, 0) + $1 WHERE id = $2",
                    [parseFloat(invoice.progress_percent) || 0, invoice.sub_item_id]
                );
            }
        }

        await client.query("UPDATE subcontractor_invoices SET status = $1 WHERE id = $2", [newStatus, invoiceId]);
        await logAdvancedAudit(client, username, 'subcontractor_invoices', invoiceId, 'Approval Workflow', `Status changed to ${newStatus}`, invoice, { ...invoice, status: newStatus });

        await client.query('COMMIT');
        
        if (workflowResult.isFinalApproval) {
            dispatchWebhook('invoice_approved', { invoiceId, newStatus, amount: invoice.net_amount, project: invoice.project_name });
        }

        res.json({ success: true, newStatus });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
