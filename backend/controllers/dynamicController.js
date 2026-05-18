const pool = require('../config/db');
const { logAudit, logAdvancedAudit, calculateMovingAverage, cleanNumeric, syncProjectFinancials } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const { checkAndSendLowStockEmail } = require('../config/mailer');
const AccountingService = require('../services/accountingService');
const projectController = require('./projectController');
const { processApprovalWorkflow } = require('../services/workflowEngine');

class DynamicController {
    async getTable(req, res) {
        try {
            const { type } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const filter = req.query.filter || '';
            const offset = (page - 1) * limit;

            let queryStr = `SELECT * FROM ${type}`;
            let countStr = `SELECT COUNT(*) FROM ${type}`;
            let prefix = "";

            if (type === 'projects') {
                prefix = "p.";
                queryStr = `SELECT p.*, 
                    (SELECT COUNT(*) FROM partners WHERE project_name = p.name AND (partner_type = 'Partner' OR partner_type = 'Both')) AS partners_count,
                    (SELECT COUNT(*) FROM partners WHERE project_name = p.name AND (partner_type = 'Admin' OR partner_type = 'Both')) AS admins_count,
                    COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE project_name = p.name AND type = 'Capital Injection'), 0) AS deposits,
                    COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE project_name = p.name AND type = 'Withdrawal'), 0) AS withdrawals,
                    (p.budget - COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE project_name = p.name AND type = 'Capital Injection'), 0)) AS remaining_budget
                    FROM projects p`;
                countStr = `SELECT COUNT(*) FROM projects p`;
            } else if (type === 'partners') {
                prefix = "p.";
                queryStr = `SELECT p.*, pr.company AS project_company, pr.budget AS proj_budget, (pr.budget * pr.expected_profit_percent / 100) AS proj_exp_amt, (pr.budget * pr.actual_profit_percent / 100) AS proj_act_amt, COALESCE((SELECT SUM(amount) FROM partner_deposits WHERE partner_id = p.id), 0) AS deposits, COALESCE((SELECT SUM(amount) FROM partner_withdrawals WHERE partner_id = p.id), 0) AS withdrawals FROM partners p LEFT JOIN projects pr ON p.project_name = pr.name`;
                countStr = `SELECT COUNT(*) FROM partners p LEFT JOIN projects pr ON p.project_name = pr.name`;
            } else if (type === 'subcontractors') {
                prefix = "s.";
                queryStr = `SELECT s.*, (SELECT COUNT(*) FROM subcontractor_invoices WHERE subcontractor_id = s.id) AS issued_invoices FROM subcontractors s`;
                countStr = `SELECT COUNT(*) FROM subcontractors s`;
            } else if (type === 'installments') {
                prefix = "i.";
                queryStr = `SELECT i.*, cu.name AS customer_name, pu.project_name,
                    CASE 
                        WHEN i.status = 'Paid' THEN 'Paid'
                        WHEN (SELECT COALESCE(SUM(amount), 0) FROM payment_receipts WHERE installment_id = i.id) > 0 
                             AND (SELECT COALESCE(SUM(amount), 0) FROM payment_receipts WHERE installment_id = i.id) < i.amount THEN 'Partial'
                        WHEN i.due_date < CURRENT_DATE AND i.status != 'Paid' THEN 'Due'
                        ELSE 'Pending'
                    END AS dynamic_status
                    FROM installments i 
                    LEFT JOIN contracts c ON i.contract_id = c.id 
                    LEFT JOIN property_units pu ON c.unit_id = pu.id 
                    LEFT JOIN customers cu ON c.customer_id = cu.id`;
                countStr = `SELECT COUNT(*) FROM installments i LEFT JOIN contracts c ON i.contract_id = c.id LEFT JOIN property_units pu ON c.unit_id = pu.id LEFT JOIN customers cu ON c.customer_id = cu.id`;
            } else if (type === 'inventory_items') {
                prefix = "inv.";
                queryStr = `SELECT inv.*, po.supplier AS supplier_name 
                            FROM inventory_items inv 
                            LEFT JOIN purchase_orders po ON inv.po_id = po.id`;
                countStr = `SELECT COUNT(*) FROM inventory_items inv LEFT JOIN purchase_orders po ON inv.po_id = po.id`;
            } else if (type === 'chart_of_accounts') {
                prefix = "c.";
                queryStr = `
                    SELECT c.*, 
                        COALESCE(
                            (SELECT SUM(
                                CASE 
                                    WHEN sub.account_type IN ('Asset', 'Expense') THEN (l.debit - l.credit)
                                    ELSE (l.credit - l.debit)
                                END
                            ) 
                            FROM ledger l 
                            JOIN chart_of_accounts sub ON l.account_name = sub.account_name
                            WHERE CAST(sub.account_code AS TEXT) LIKE (RTRIM(CAST(c.account_code AS TEXT), '0') || '%')
                            ), 
                        0) AS balance 
                    FROM chart_of_accounts c
                `;
                countStr = `SELECT COUNT(*) FROM chart_of_accounts c`;
            }

            let conditions = [`${prefix || ''}is_deleted = FALSE`]; let params = [];
            if (filter) {
                if (['contracts', 'installments', 'payment_receipts'].includes(type)) { conditions.push(`pu.project_name = $${params.length + 1}`); params.push(filter); }
                else if (['projects', 'partners', 'boq', 'tasks', 'rfq', 'purchase_orders', 'subcontractors', 'inventory', 'inventory_items', 'material_usage', 'ar_invoices', 'inventory_sales'].includes(type)) { conditions.push(`${prefix}project_name = $${params.length + 1}`); params.push(filter); }
                else if (type === 'ledger') {
                    if (filter === 'Inventory') {
                        conditions.push(`source_module = $${params.length + 1}`);
                    } else {
                        conditions.push(`cost_center = $${params.length + 1}`);
                    }
                    params.push(filter);
                }
            }
            if (search) {
                const searchIdx = params.length + 1;
                conditions.push(`(CAST(${prefix}id AS TEXT) ILIKE $${searchIdx})`);
                params.push(`%${search}%`);
            }

            // --- 🌟 RLS & Data Isolation Injection 🌟 ---
            const userRole = (req.user.role || '').toLowerCase();
            const normalizedUsername = (req.user.username || '').toLowerCase().trim();
            const isAdmin = req.user.isSuperAdmin || userRole.includes('admin') || normalizedUsername === 'admin';

            const isRestricted = Boolean(req.user.linkedCompany || req.user.linkedProject);

            if (isRestricted) {
                if (req.user.linkedCompany) {
                    const c = req.user.linkedCompany;
                    if (type === 'projects' || type === 'staff' || type === 'rfq' || type === 'employees') {
                        conditions.push(`${prefix}company = $${params.length + 1}`);
                        params.push(c);
                    } else if (type === 'customers') {
                        conditions.push(`company_name = $${params.length + 1}`);
                        params.push(c);
                    } else if (type === 'purchase_orders' || type === 'inventory_items' || type === 'inventory_bookings' || type === 'boq' || type === 'subcontractor_items' || type === 'material_usage' || type === 'ar_invoices' || type === 'inventory_sales' || type === 'tasks') {
                        conditions.push(`${prefix}project_name IN (SELECT name FROM projects WHERE company = $${params.length + 1})`);
                        params.push(c);
                    } else if (type === 'ledger') {
                        conditions.push(`(cost_center IN (SELECT name FROM projects WHERE company = $${params.length + 1}) OR cost_center = $${params.length + 1})`);
                        params.push(c);
                    }
                }
                if (req.user.linkedProject) {
                    const p = req.user.linkedProject;
                    if (type === 'projects') {
                        conditions.push(`${prefix}name = $${params.length + 1}`);
                        params.push(p);
                    } else if (type === 'purchase_orders' || type === 'inventory_items' || type === 'inventory_bookings' || type === 'boq' || type === 'subcontractor_items' || type === 'material_usage' || type === 'ar_invoices' || type === 'inventory_sales' || type === 'tasks') {
                        conditions.push(`${prefix}project_name = $${params.length + 1}`);
                        params.push(p);
                    } else if (type === 'ledger') {
                        conditions.push(`cost_center = $${params.length + 1}`);
                        params.push(p);
                    }
                }
            } else if (!isAdmin) {
                // Determine permissions array (supporting both legacy array and new object format)
                let perms = [];
                if (Array.isArray(req.user.permissions)) {
                    perms = req.user.permissions;
                } else if (req.user.permissions && Array.isArray(req.user.permissions.functions)) {
                    perms = req.user.permissions.functions;
                }

                if (type === 'projects') {
                    if (!perms.includes('PROJ_VIEW_ALL') && perms.includes('PROJ_VIEW_BRANCH')) {
                        conditions.push(`p.org_unit_id = $${params.length + 1}`);
                        params.push(req.user.primaryOrgUnitId);
                    } else if (!perms.includes('PROJ_VIEW_ALL')) {
                        conditions.push(`p.project_manager = $${params.length + 1}`);
                        params.push(req.user.username);
                    }
                } else if (type === 'customers') {
                    if (!perms.includes('COMP_VIEW_ALL') && req.user.primaryOrgUnitId) {
                        conditions.push(`org_unit_id = $${params.length + 1}`);
                        params.push(req.user.primaryOrgUnitId);
                    }
                }
            }
            // --------------------------------------------------

            if (conditions.length > 0) {
                const whereClause = " WHERE " + conditions.join(" AND ");
                queryStr += whereClause; countStr += whereClause;
            }
            const orderCol = type === 'employees' ? 'emp_id' : `${prefix}id`;
            queryStr += ` ORDER BY ${orderCol} DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

            const result = await pool.query(queryStr, [...params, limit, offset]);
            const countResult = await pool.query(countStr, params);
            res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
        } catch (err) {
            console.error(`❌ [DynamicController] getTable Error (${req.params.type}):`, err);
            res.status(500).json({ error: err.message });
        }
    }
    async addRecord(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { type } = req.params;
            let data = req.body;
            let skipInsert = (type === 'ledger');
            let newId = null;

            if (!hasAccess(req.user, type, 'create')) throw new Error("Access Denied.");

            // 1. Specific Pre-Processing Logic
            if (type === 'projects') {
                // توليد الرقم المسلسل آلياً إذا لم يتم توفيره
                if (!data.project_serial) {
                    data.project_serial = await projectController.generateProjectSerial();
                }

                // حساب الميزانية بالعملة المحلية آلياً بناءً على العملة الأجنبية وسعر الصرف
                if (data.fcy_budget && data.fx_rate) {
                    data.budget = parseFloat(data.fcy_budget) * parseFloat(data.fx_rate);
                } else if (data.budget_lcy) {
                    // إذا أرسل الفرونت إند budget_lcy نضعه في الحقل الأساسي budget
                    data.budget = parseFloat(data.budget_lcy);
                }

                // تنظيف البيانات المرسلة لضمان توافقها مع قاعدة البيانات
                delete data.budget_lcy;
            } else if (type === 'inventory' || type === 'inventory_items') {
                if (!data.remaining_qty) data.remaining_qty = data.qty || data.quantity;
                const newQty = parseFloat(data.qty) || 0;
                const newPrice = parseFloat(data.buy_price) || 0;
                const itemName = data.item_name || data.name;
                if (newQty > 0 && newPrice > 0 && itemName) {
                    const checkInv = await client.query("SELECT remaining_qty, buy_price FROM inventory_items WHERE item_name = $1 OR name = $1 LIMIT 1", [itemName]);
                    if (checkInv.rows.length > 0) {
                        data.buy_price = calculateMovingAverage(parseFloat(checkInv.rows[0].remaining_qty), parseFloat(checkInv.rows[0].buy_price), newQty, newPrice);
                    }
                }
            }

            if (type === 'projects' || type === 'customers') {
                if (!data.org_unit_id && req.user.primaryOrgUnitId) {
                    data.org_unit_id = req.user.primaryOrgUnitId;
                }
            }

            if (type === 'subcontractor_items') {
                if (!data.item_desc && data.boq_id) {
                    const boqRes = await client.query("SELECT item_name, item_desc FROM boq WHERE id = $1 LIMIT 1", [data.boq_id]);
                    if (boqRes.rows.length > 0) {
                        data.item_desc = boqRes.rows[0].item_name || boqRes.rows[0].item_desc || 'Unspecified Work';
                    } else {
                        data.item_desc = 'Unspecified Work';
                    }
                } else if (!data.item_desc) {
                    data.item_desc = 'Unspecified Work';
                }
            }

            // 2. Generic Insert
            if (!skipInsert) {
                // Remove ID if present to allow DB to auto-generate SERIAL ID
                delete data.id;

                // Sanitize Data: Convert empty strings to null for DB compatibility
                Object.keys(data).forEach(key => {
                    if (data[key] === '') data[key] = null;
                });

                // Clean data (remove calculated/virtual fields that are not in DB)
                const calcFields = ['id', 'created_at', 'updated_at', 'items', 'item', 'charge_id', 'dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'partners_count', 'admins_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'waivePenalty'];
                calcFields.forEach(f => delete data[f]);

                const keys = Object.keys(data);
                const values = Object.values(data);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                // --- 🚀 Elite Workflow Engine Integration 🚀 ---
                let initialStatus = data.status || 'Active';
                const amountForWorkflow = parseFloat(data.amount || data.total_amount || data.total || data.budget || 0);
                let workflowResult = { newStatus: initialStatus };

                // Only run workflow for major modules
                if (['purchase_orders', 'ar_invoices', 'inventory_sales', 'projects', 'subcontractor_invoices'].includes(type)) {
                    workflowResult = await processApprovalWorkflow(type, null, 'Submit', req.user.username, req.user.role, amountForWorkflow);
                    if (workflowResult.newStatus === 'Pending Authorization') {
                        initialStatus = 'Pending Authorization';
                        if (keys.includes('status')) {
                            data.status = initialStatus;
                        }
                    }
                }
                // ----------------------------------------------

                const result = await client.query(`INSERT INTO ${type} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`, values);
                const recordId = result.rows[0].id;
                newId = recordId;

                // 🔗 Link Workflow Instance to Record ID
                if (workflowResult.instanceId) {
                    await client.query("UPDATE workflow_instances SET record_id = $1 WHERE id = $2", [recordId, workflowResult.instanceId]);
                }

                // 🌟 Automated Accounting Integration
                if (type === 'partner_transactions') {
                    const { partner_id, type: trxType, amount, description, date } = data;
                    const partnerRes = await client.query("SELECT name FROM partners WHERE id = $1", [partner_id]);
                    const partnerName = partnerRes.rows[0]?.name || 'Unknown Partner';

                    if (trxType === 'Capital Injection') {
                        await AccountingService.logEntry(client, '1101', data.project_name || 'General', amount, 0, `ضخ رأس مال - الشريك: ${partnerName} - ${description}`, 'System', recordId);
                        await AccountingService.logEntry(client, '3200', data.project_name || 'General', 0, amount, `ضخ رأس مال - الشريك: ${partnerName} - ${description}`, 'System', recordId);
                    } else if (trxType === 'Withdrawal') {
                        await AccountingService.logEntry(client, '3200', data.project_name || 'General', amount, 0, `مسحوبات شريك: ${partnerName} - ${description}`, 'System', recordId);
                        await AccountingService.logEntry(client, '1101', data.project_name || 'General', 0, amount, `مسحوبات شريك: ${partnerName} - ${description}`, 'System', recordId);
                    }
                } else if (type === 'material_usage') {
                    // 🌟 صرف بضاعة لمشروع (Expense Tracking)
                    const cost = parseFloat(data.qty) * (parseFloat(data.unit_cost) || 0);
                    if (cost > 0) {
                        await AccountingService.recordDoubleEntry(client, {
                            debitAccount: '5100', creditAccount: '1130', amount: cost, costCenter: data.project_name,
                            description: `صرف خامات للمشروع - صنف: ${data.material} - كمية: ${data.qty}`,
                            username: req.user?.username || 'System', referenceNo: `USG-${recordId}`
                        });
                    }
                } else if (type === 'returns') {
                    // 🌟 ارتجاع بضاعة من مشروع للمخزن
                    const cost = parseFloat(data.qty) * (parseFloat(data.unit_cost) || 0);
                    if (cost > 0) {
                        await AccountingService.recordDoubleEntry(client, {
                            debitAccount: '1130', creditAccount: '5100', amount: cost, costCenter: data.project_name,
                            description: `ارتجاع خامات للمخزن - صنف: ${data.material} - كمية: ${data.qty}`,
                            username: req.user?.username || 'System', referenceNo: `RET-${recordId}`
                        });
                    }
                }
            }

            // 3. Post-Processing & Side Effects
            if (type === 'payment_receipts' && data.installment_id) {
                const receiptAmt = parseFloat(data.amount || 0);
                const projName = data.project_name || 'General';
                await AccountingService.logEntry(client, 'صندوق نقدية - تيد كابيتال', projName, receiptAmt, 0, `إيصال استلام من عميل - قسط ${data.installment_no || ''}`, req.user.username);
                await AccountingService.logEntry(client, 'العملاء', projName, 0, receiptAmt, `إيصال استلام من عميل - قسط ${data.installment_no || ''}`, req.user.username);
            }

            if (type === 'ledger') {
                await AccountingService.logEntry(client, data.account_name, data.cost_center, cleanNumeric(data.debit), cleanNumeric(data.credit), data.description, req.user.username);
            }

            await logAudit(req.user.username, 'CREATE', type, newId || 'N/A', `Added record to ${type}`);
            await client.query('COMMIT');
            res.json({ success: true, id: newId });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`🔥 [DynamicController] addRecord Error (Table: ${req.params.type}):`, err);

            // Handle Unique Constraint Violations
            if (err.code === '23505') {
                if (err.constraint === 'projects_name_key') {
                    return res.status(400).json({ error: "اسم المشروع موجود بالفعل. يرجى اختيار اسم آخر." });
                }
                if (err.constraint === 'projects_project_serial_key') {
                    return res.status(400).json({ error: "الرقم المسلسل للمشروع موجود بالفعل." });
                }
                return res.status(400).json({ error: "هذا السجل موجود بالفعل (تكرار في البيانات الفريدة)." });
            }

            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }

    async updateRecord(req, res) {
        const { type, id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let data = req.body;
            if (!hasAccess(req.user, type, 'update')) throw new Error("Access Denied.");

            let oldData = {};
            const oldRes = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
            if (oldRes.rows.length > 0) oldData = oldRes.rows[0];

            // Pre-Processing for Projects in Update
            if (type === 'projects') {
                if (data.fcy_budget && data.fx_rate) {
                    data.budget = parseFloat(data.fcy_budget) * parseFloat(data.fx_rate);
                } else if (data.budget_lcy) {
                    data.budget = parseFloat(data.budget_lcy);
                }
                delete data.budget_lcy;
            }

            // Sanitize Data: Convert empty strings to null for DB compatibility
            Object.keys(data).forEach(key => {
                if (data[key] === '') data[key] = null;
            });

            const calcFields = ['id', 'created_at', 'updated_at', 'items', 'item', 'admins_count', 'remaining_budget', 'charge_id', 'dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'partners_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'waivePenalty'];
            calcFields.forEach(f => delete data[f]);

            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const query = `UPDATE ${type} SET ${setClause} WHERE id = $${keys.length + 1}`;
            console.log(`📝 [DynamicController] Executing Update: ${query}`, values, id);
            await client.query(query, [...values, id]);

            await logAdvancedAudit(client, req.user.username, type, id, 'UPDATE', `Updated record in ${type}`, oldData, data);
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`❌ [DynamicController] updateRecord Error (${type}/${id}):`, err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }

    async deleteRecord(req, res) {
        const { type, id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            if (!hasAccess(req.user, type, 'delete')) throw new Error("Access Denied.");

            const preDel = await client.query(`SELECT * FROM ${type} WHERE id = $1`, [id]);
            const oldData = preDel.rows[0] || {};

            // Soft Deletion instead of Hard Deletion
            await client.query(`UPDATE ${type} SET is_deleted = TRUE, deleted_by = $1, deleted_at = CURRENT_TIMESTAMP WHERE id = $2`, [req.user.username, id]);
            await logAdvancedAudit(client, req.user.username, type, id, 'SOFT_DELETE', 'Record marked as deleted', oldData, null);

            await client.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`❌ [DynamicController] deleteRecord Error (${type}/${id}):`, err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }
}

module.exports = new DynamicController();
