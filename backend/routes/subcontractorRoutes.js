const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');
const { logAdvancedAudit } = require('../utils/helpers');
const SubcontractorController = require('../controllers/subcontractorController');

// محاكاة مؤقتة للمحركات لحين استكمالها بالكامل
let processApprovalWorkflow = async () => ({ newStatus: 'اعتماد مالي', isFinalApproval: true });
let dispatchWebhook = () => {};
try {
    processApprovalWorkflow = require('../services/workflowEngine').processApprovalWorkflow;
    dispatchWebhook = require('../services/webhookDispatcher').dispatchWebhook;
} catch (e) {}

router.use(authenticateToken);

// --- Strategic Intelligence & Dashboard Stats ---
router.get('/global/stats', SubcontractorController.getGlobalStats);
router.get('/analytics/dashboard', SubcontractorController.getSubcontractorAnalytics);
router.get('/intelligence/:id', SubcontractorController.getSubcontractorIntelligence);

// --- Operations & Transaction Posting ---
router.post('/contract', SubcontractorController.createContract);
router.post('/progress_claim', SubcontractorController.submitProgressClaim);
router.post('/bond', SubcontractorController.registerBond);
router.post('/release_retention', SubcontractorController.releaseRetention);
router.put('/performance/:id', SubcontractorController.updatePerformance);

// --- Portal Credentials Management ---
router.put('/portal_credentials/:id', SubcontractorController.updatePortalCredentials);
router.post('/portal_login', SubcontractorController.portalLogin);

// --- Detailed Progressive Claims Endpoint ---
router.post('/progress_claim_detailed', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const {
            subcontractor_id,
            contract_id,
            sub_item_id,
            project_name,
            curr_qty,
            prev_qty,
            gross_amount,
            retention_deduction,
            dp_recovery,
            material_deduction,
            tax_deduction,
            net_amount,
            progress_percent,
            description,
            date
        } = req.body;

        const username = req.user ? req.user.username : 'Engineer';

        // Fetch Subcontractor Info
        const subRes = await client.query("SELECT name, company_id FROM subcontractors WHERE id = $1", [subcontractor_id]);
        if (subRes.rows.length === 0) throw new Error("Subcontractor entity not found.");
        const sub = subRes.rows[0];

        // Insert detailed progress claim invoice
        const insertQuery = `
            INSERT INTO subcontractor_invoices (
                subcontractor_id, subcontractor_name, contract_id, sub_item_id, project_name,
                curr_qty, prev_qty, gross_amount, retention_deduction, dp_recovery,
                material_deduction, tax_deduction, net_amount, amount, progress_percent,
                description, date, status, company_id, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Pending', $18, $19
            ) RETURNING id
        `;

        const resClaim = await client.query(insertQuery, [
            subcontractor_id,
            sub.name,
            contract_id || null,
            sub_item_id || null,
            project_name || 'General',
            parseFloat(curr_qty) || 0,
            parseFloat(prev_qty) || 0,
            parseFloat(gross_amount) || 0,
            parseFloat(retention_deduction) || 0,
            parseFloat(dp_recovery) || 0,
            parseFloat(material_deduction) || 0,
            parseFloat(tax_deduction) || 0,
            parseFloat(net_amount) || 0,
            parseFloat(net_amount) || 0, // amount = net_amount
            parseFloat(progress_percent) || 0,
            description || `مستخلص أعمال جاري لصالح ${sub.name}`,
            date || new Date(),
            sub.company_id || 1,
            username
        ]);

        const claimId = resClaim.rows[0].id;
        await logAdvancedAudit(client, username, 'subcontractor_invoices', claimId, 'CREATE_CLAIM', `Drafted progressive claim #${claimId} worth Net: ${net_amount}`, null, req.body);

        await client.query('COMMIT');
        res.json({ success: true, claimId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- Standard Invoice Approval Workflow & Auto Accounting Entry ---
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
            const netAmount = parseFloat(invoice.net_amount) || 0;
            const grossAmount = parseFloat(invoice.gross_amount) || 0;
            const retention = parseFloat(invoice.retention_deduction) || 0;
            const advanceRecovery = parseFloat(invoice.dp_recovery) || 0;
            const materialRecovery = parseFloat(invoice.material_deduction) || 0;
            const taxDeduction = parseFloat(invoice.tax_deduction) || 0;
            
            const projectName = invoice.project_name || 'General';
            const desc = `اعتماد مستخلص مقاول باطن رقم #${invoiceId} - ${invoice.description}`;
            
            const AccountingService = require('../services/accountingService');
            
            // If we have a detailed claim with a non-zero gross amount, log a multi-leg balanced split entry
            if (grossAmount > 0) {
                // Debit: Direct Project Contracting Expenses (تكلفة مقاولي الباطن)
                await AccountingService.logEntry(client, 'تكلفة مقاولي الباطن', projectName, grossAmount, 0, desc, username, `INV-${invoiceId}`, null, 'Contracting', null, false, null, invoice.company_id);
                
                // Credit: Accounts Payable (مقاولي الباطن)
                await AccountingService.logEntry(client, 'مقاولي الباطن', projectName, 0, netAmount, desc, username, `INV-${invoiceId}`, null, 'Contracting', null, false, null, invoice.company_id);
                
                // Credit: Retentions Withheld (تأمينات مستقطعة لجهات خارجية)
                if (retention > 0) {
                    await AccountingService.logEntry(client, 'تأمينات مستقطعة لجهات خارجية', projectName, 0, retention, `استقطاع ضمان مستخلص رقم #${invoiceId}`, username, `INV-${invoiceId}`, null, 'Contracting', null, false, null, invoice.company_id);
                }
                
                // Credit: Advance Recoveries (دفعات مقدمة لمقاولي الباطن / تأمين أعمال)
                if (advanceRecovery > 0) {
                    await AccountingService.logEntry(client, 'دفعات مقدمة لمقاولي الباطن', projectName, 0, advanceRecovery, `استرداد دفعة مقدمة مستخلص رقم #${invoiceId}`, username, `INV-${invoiceId}`, null, 'Contracting', null, false, null, invoice.company_id);
                }
                
                // Credit: Materials Deduction (مخزون خامات ومواد)
                if (materialRecovery > 0) {
                    await AccountingService.logEntry(client, 'مخزون خامات ومواد', projectName, 0, materialRecovery, `خصم خامات مجهزة مستخلص رقم #${invoiceId}`, username, `INV-${invoiceId}`, null, 'Contracting', null, false, null, invoice.company_id);
                }

                // Credit: Tax Withholding (ضرائب الخصم والإضافة (WHT))
                if (taxDeduction > 0) {
                    await AccountingService.logEntry(client, 'ضرائب الخصم والإضافة (WHT)', projectName, 0, taxDeduction, `خصم ضرائب وأعباء مستخلص رقم #${invoiceId}`, username, `INV-${invoiceId}`, null, 'Contracting', null, false, null, invoice.company_id);
                }
            } else {
                // Fallback: simple standard double entry to ensure 100% backward compatibility
                await AccountingService.recordDoubleEntry(client, {
                    debitAccount: 'تكلفة مقاولي الباطن',
                    creditAccount: 'مقاولي الباطن',
                    amount: netAmount,
                    costCenter: projectName,
                    description: desc,
                    username: username,
                    companyId: invoice.company_id
                });
            }
            
            // تحديث كميات الـ BOQ (Update bill of quantities)
            if (invoice.sub_item_id) {
                // If it is a detailed quantity claim, add current executed quantity to actual quantities
                const qtyToAdd = parseFloat(invoice.curr_qty) > 0 ? parseFloat(invoice.curr_qty) : (parseFloat(invoice.progress_percent) || 0);
                await client.query(
                    "UPDATE boq SET dynamic_act_qty = COALESCE(dynamic_act_qty, 0) + $1, actual_subcontractor_cost = COALESCE(actual_subcontractor_cost, 0) + $2 WHERE id = $3",
                    [qtyToAdd, netAmount, invoice.sub_item_id]
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
