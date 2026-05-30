const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');
const AccountingService = require('../services/accountingService');

// --- REUSABLE GL POSTING FUNCTION ---
async function postExpenseToGL(client, expense, userId) {
    const metadata = expense.metadata || {};
    const costCode = metadata.cost_code || 'Other';
    const payMethod = metadata.payment_detail || expense.payment_method;
    const companyName = expense.company_entity || '';

    // 1. Map Expense Account (Debit)
    let debitAcc = 31; // Default: Admin/General (6000)
    if (costCode === 'Materials') debitAcc = 27;
    if (costCode === 'Subcontractor') debitAcc = 28;
    if (costCode === 'Labor') debitAcc = 29;

    // 2. Map Payment Account (Credit)
    let creditAcc = 3; // Default: Cash Ted Capital
    if (companyName.includes('DESIGN') || companyName.includes('ديزاين')) {
        creditAcc = payMethod.includes('Bank') ? 6 : 4;
    } else if (companyName.includes('MASTER') || companyName.includes('ماستر')) {
        creditAcc = payMethod.includes('Bank') ? 39 : 38;
    } else { // TED CAPITAL or Default
        creditAcc = payMethod.includes('Bank') ? 5 : 3;
    }

    // 3. Map Company ID
    let companyId = 1; // Default TED
    if (companyName.includes('DESIGN') || companyName.includes('ديزاين')) companyId = 2;
    if (companyName.includes('MASTER') || companyName.includes('ماستر')) companyId = 3;

    // 4. Create Journal Entry
    if (expense.project_id) {
        await client.query(`
            INSERT INTO journal_entries (
                debit_account_id, credit_account_id, amount, project_id, 
                company_id, description, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            debitAcc, creditAcc, expense.amount, expense.project_id,
            companyId, `Exp Approval: ${expense.description}`, 'Posted',
            JSON.stringify({ reference_type: 'EXPENSE', reference_id: expense.id, cost_code: costCode })
        ]);
    } else {
        const projectsRes = await client.query("SELECT id FROM projects WHERE company = $1 AND is_deleted = FALSE", [companyName]);
        const projects = projectsRes.rows;
        if (projects.length > 0) {
            const splitAmt = parseFloat(expense.amount) / projects.length;
            for (const proj of projects) {
                await client.query(`
                    INSERT INTO journal_entries (
                        debit_account_id, credit_account_id, amount, project_id, 
                        company_id, description, status, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    debitAcc, creditAcc, splitAmt, proj.id,
                    companyId, `Distributed Exp: ${expense.description}`, 'Posted',
                    JSON.stringify({ reference_type: 'EXPENSE_SPLIT', reference_id: expense.id, cost_code: costCode })
                ]);
            }
        } else {
            await client.query(`
                INSERT INTO journal_entries (
                    debit_account_id, credit_account_id, amount, project_id, 
                    company_id, description, status, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                debitAcc, creditAcc, expense.amount, null,
                companyId, `Exp Approval (Corporate): ${expense.description}`, 'Posted',
                JSON.stringify({ reference_type: 'EXPENSE', reference_id: expense.id, cost_code: costCode })
            ]);
        }
    }
}

// 1. Create Expense
router.post('/', authenticateToken, async (req, res) => {
    const { 
        description, amount, currency, category_id, project_id, 
        expense_date, payment_method, supplier_name, receipt_url, 
        is_billable, tax_amount, company_entity, metadata, auto_post
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const status = auto_post ? 'Approved' : 'Pending';
        const approvedBy = auto_post ? req.user.id : null;

        const result = await client.query(`
            INSERT INTO expenses (
                description, amount, currency, category_id, project_id, 
                expense_date, payment_method, supplier_name, receipt_url, 
                is_billable, tax_amount, company_entity, created_by, status, approved_by, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `, [
            description, amount, currency || 'EGP', category_id, project_id || null,
            expense_date || new Date(), payment_method || 'Cash', supplier_name, 
            receipt_url, is_billable || false, tax_amount || 0, company_entity, 
            req.user.id, status, approvedBy, { ...metadata, exchange_rate: req.body.exchange_rate || 1 }
        ]);
        
        const expense = result.rows[0];

        if (auto_post) {
            // Modern GL Posting via AccountingService
            const mapping = await AccountingService.getMapping(client, 'EXPENSE_PAYMENT');
            const debitAcc = mapping?.debit_account || '6000';

            await AccountingService.recordDoubleEntry(client, {
                debitAccount: debitAcc, // category_id maps to an expense account in COA
                creditAccount: payment_method === 'Bank' ? '1111' : '1101', // Standard fallback mappings
                amount: amount,
                costCenter: project_id || 'General',
                description: `مصروف: ${description} (${company_entity})`,
                username: req.user.username,
                referenceNo: `EXP-${expense.id}`,
                sourceModule: 'Expenses',
                date: expense.expense_date
            });
        }

        await client.query('COMMIT');
        res.status(201).json(expense);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 1b. Update Expense (Edit)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { 
        description, amount, currency, category_id, project_id, 
        expense_date, payment_method, supplier_name, receipt_url, 
        is_billable, tax_amount, company_entity, metadata
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if expense exists
        const check = await client.query("SELECT * FROM expenses WHERE id = $1 AND is_deleted = FALSE", [id]);
        if (check.rows.length === 0) throw new Error("المصروف غير موجود.");

        const result = await client.query(`
            UPDATE expenses SET
                description = $1, amount = $2, currency = $3, category_id = $4, project_id = $5,
                expense_date = $6, payment_method = $7, supplier_name = $8, receipt_url = $9,
                is_billable = $10, tax_amount = $11, company_entity = $12, metadata = $13,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $14
            RETURNING *
        `, [
            description, amount, currency || 'EGP', category_id, project_id || null,
            expense_date || new Date(), payment_method || 'Cash', supplier_name,
            receipt_url, is_billable || false, tax_amount || 0, company_entity,
            { ...check.rows[0].metadata, ...metadata, exchange_rate: req.body.exchange_rate || 1 },
            id
        ]);

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("🔥 Expense Update Error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 2. Get Expenses with Filters & Summary
router.get('/', authenticateToken, async (req, res) => {
    const { category_id, project_id, start_date, end_date, status, search } = req.query;
    
    let query = `
        SELECT e.*, c.name as category_name, p.name as project_name, u.username as creator_name
        FROM expenses e
        LEFT JOIN expense_categories c ON e.category_id = c.id
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.is_deleted = FALSE
    `;
    const params = [];

    if (category_id) {
        params.push(category_id);
        query += ` AND e.category_id = $${params.length}`;
    }
    if (project_id) {
        params.push(project_id);
        query += ` AND e.project_id = $${params.length}`;
    }
    if (status) {
        params.push(status);
        query += ` AND e.status = $${params.length}`;
    }
    if (start_date && end_date) {
        params.push(start_date, end_date);
        query += ` AND e.expense_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    if (search) {
        params.push(`%${search}%`);
        query += ` AND (e.description ILIKE $${params.length} OR e.supplier_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

    try {
        const result = await pool.query(query, params);
        
        // Calculate Summary
        const summary = {
            totalAmount: result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0),
            totalTax: result.rows.reduce((sum, r) => sum + parseFloat(r.tax_amount), 0),
            count: result.rows.length,
            byCategory: {},
            byStatus: {}
        };

        result.rows.forEach(r => {
            summary.byCategory[r.category_name] = (summary.byCategory[r.category_name] || 0) + parseFloat(r.amount);
            summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
        });

        res.json({ data: result.rows, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Analytics
router.get('/analytics', authenticateToken, async (req, res) => {
    try {
        const monthly = await pool.query(`
            SELECT 
                TO_CHAR(expense_date, 'YYYY-MM') as month,
                SUM(amount) as total_amount,
                COUNT(*) as count
            FROM expenses
            WHERE is_deleted = FALSE
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);

        const projectCosts = await pool.query(`
            SELECT 
                p.name as project_name,
                SUM(e.amount) as total_cost
            FROM expenses e
            JOIN projects p ON e.project_id = p.id
            WHERE e.is_deleted = FALSE
            GROUP BY p.name
            ORDER BY total_cost DESC
            LIMIT 5
        `);

        res.json({ monthly: monthly.rows, projectCosts: projectCosts.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Update Status (Approval Flow with Dynamic Auto-GL)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            "UPDATE expenses SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
            [status, req.user.id, id]
        );
        
        if (result.rows.length === 0) throw new Error("المصروف غير موجود.");
        const expense = result.rows[0];

        if (status === 'Approved') {
            const metadata = expense.metadata || {};
            const payMethod = metadata.payment_detail || expense.payment_method;
            const companyName = expense.company_entity || '';

            // 1. Fetch Mapping from modern Accounting Service
            const mapping = await AccountingService.getMapping(client, 'EXPENSE_PAYMENT');
            
            // 2. Resolve Debit Account (Expense)
            let debitAcc = mapping?.debit_account || '6000'; // Fallback to Admin Expenses
            
            // 3. Resolve Credit Account (Payment Source)
            let creditAcc = mapping?.credit_account || '1101'; // Fallback to Cash Ted Capital
            
            // Legacy override for specific companies/methods if mapping is too generic
            if (payMethod.includes('Bank')) {
                if (companyName.includes('DESIGN') || companyName.includes('ديزاين')) creditAcc = '1112';
                else creditAcc = '1111';
            } else {
                if (companyName.includes('DESIGN') || companyName.includes('ديزاين')) creditAcc = '1102';
                else creditAcc = '1101';
            }

            // 4. Record Balanced Double Entry via Accounting Service
            await AccountingService.recordDoubleEntry(client, {
                debitAccount: debitAcc,
                creditAccount: creditAcc,
                amount: expense.amount,
                costCenter: expense.project_id || 'General',
                description: `إعتماد مصروف: ${expense.description} (${companyName})`,
                username: req.user.username,
                referenceNo: `EXP-${expense.id}`,
                sourceModule: 'Expenses',
                date: expense.expense_date,
                reqContext: { primaryOrgUnitId: expense.company_id }
            });
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("🔥 Expense Status Update Error:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 5. Delete Expense (Soft Delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        await client.query(
            "UPDATE expenses SET is_deleted = TRUE, deleted_by = $1, deleted_at = CURRENT_TIMESTAMP WHERE id = $2",
            [req.user.username, id]
        );
        
        await client.query(
            "UPDATE ledger SET is_deleted = true, description = description || ' (Reversed)' WHERE reference_no = $1",
            [`EXP-${id}`]
        );
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;

