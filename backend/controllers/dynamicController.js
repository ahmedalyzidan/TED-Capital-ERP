const pool = require('../config/db');
const { logAudit, logAdvancedAudit, calculateMovingAverage, cleanNumeric, syncProjectFinancials, resolveScope, buildCompanyFilter } = require('../utils/helpers');
const { hasAccess } = require('../middlewares/auth');
const { checkAndSendLowStockEmail, sendEmailNotification } = require('../config/mailer');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const AccountingService = require('../services/accountingService');
const projectController = require('./projectController');
const { processApprovalWorkflow } = require('../services/workflowEngine');

async function recalculateCBMProration(client, shipmentId, username = 'System') {
    if (!shipmentId) return;
    try {
        const sumRes = await client.query("SELECT SUM(amount_ils) as total FROM shipment_expenses WHERE shipment_id = $1 AND is_deleted = false", [shipmentId]);
        const totalExp = parseFloat(sumRes.rows[0]?.total || 0);

        const shipRes = await client.query("SELECT initial_value, exchange_rate_initial, shipment_no FROM pharma_shipments WHERE id = $1", [shipmentId]);
        if (shipRes.rows.length === 0) return;
        const ship = shipRes.rows[0];
        const landedCost = (parseFloat(ship.initial_value || 0) * parseFloat(ship.exchange_rate_initial || 1)) + totalExp;

        await client.query("UPDATE pharma_shipments SET total_expenses_ils = $1, landed_cost_ils = $2 WHERE id = $3", [totalExp, landedCost, shipmentId]);

        const itemsRes = await client.query("SELECT * FROM shipment_items WHERE shipment_id = $1 AND is_deleted = false", [shipmentId]);
        const items = itemsRes.rows;
        if (items.length === 0) return;

        const totalCbm = items.reduce((acc, curr) => acc + parseFloat(curr.total_cbm || 0), 0);

        for (const item of items) {
            const itemCbm = parseFloat(item.total_cbm || 0);
            const volumeRatio = totalCbm > 0 ? (itemCbm / totalCbm) : (1 / items.length);
            const allocatedShipping = totalExp * volumeRatio;
            
            const qty = parseFloat(item.quantity || 1);
            const buyPriceIls = parseFloat(item.buy_price || 0) * parseFloat(ship.exchange_rate_initial || 1);
            const landedUnitCost = buyPriceIls + (qty > 0 ? (allocatedShipping / qty) : 0);

            await client.query("UPDATE shipment_items SET allocated_shipping_ils = $1, landed_unit_cost_ils = $2 WHERE id = $3", [allocatedShipping, landedUnitCost, item.id]);

            // Log Audit for external auditors
            await logAudit(username, 'CBM_PRORATION', 'shipment_items', item.id, `Prorated CBM landed cost for item ${item.item_name || item.id}. Allocated Shipping: ${allocatedShipping.toFixed(2)} ILS, Landed Unit Cost: ${landedUnitCost.toFixed(2)} ILS`);
        }

        await logAudit(username, 'SHIPMENT_PRORATION', 'pharma_shipments', shipmentId, `Recalculated total shipment expenses (${totalExp.toFixed(2)} ILS) and landed cost (${landedCost.toFixed(2)} ILS) for shipment #${ship.shipment_no || shipmentId}`);
    } catch (err) {
        console.error("🔥 Error recalculating CBM Proration:", err);
    }
}

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
            } else if (type === 'subcontractor_invoices') {
                prefix = "si.";
                queryStr = `SELECT si.*, p.name AS project_name,
                    COALESCE((
                      SELECT SUM(ss.amount) 
                      FROM subcontractor_statements ss 
                      WHERE ss.is_deleted = false 
                        AND ss.type = 'صرف مستخلص' 
                        AND (CASE WHEN ss.metadata->>'invoice_id' ~ '^[0-9]+$' THEN (ss.metadata->>'invoice_id')::integer ELSE NULL END) = si.id
                    ), 0) AS total_paid,
                    (si.net_amount - COALESCE((
                      SELECT SUM(ss.amount) 
                      FROM subcontractor_statements ss 
                      WHERE ss.is_deleted = false 
                        AND ss.type = 'صرف مستخلص' 
                        AND (CASE WHEN ss.metadata->>'invoice_id' ~ '^[0-9]+$' THEN (ss.metadata->>'invoice_id')::integer ELSE NULL END) = si.id
                    ), 0)) AS remaining_amount
                  FROM subcontractor_invoices si
                  LEFT JOIN projects p ON si.project_id = p.id`;
                countStr = `SELECT COUNT(*) FROM subcontractor_invoices si`;
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
            } else if (type === 'client_payment_history') {
                prefix = "cph.";
                queryStr = `SELECT cph.*, c.name AS client_name, p.name AS project_name
                            FROM client_payment_history cph
                            LEFT JOIN customers c ON cph.client_id = c.id
                            LEFT JOIN projects p ON cph.project_id = p.id`;
                countStr = `SELECT COUNT(*) FROM client_payment_history cph`;
            } else if (type === 'subcontractor_statements') {
                prefix = "ss.";
                queryStr = `SELECT ss.*, s.id AS subcontractor_id
                            FROM subcontractor_statements ss
                            LEFT JOIN subcontractors s ON ss.sub_name = s.name`;
                countStr = `SELECT COUNT(*) FROM subcontractor_statements ss`;
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
                } else if (type === 'subcontractor_invoices') {
                    conditions.push(`${prefix}project_id = $${params.length + 1}`);
                    params.push(parseInt(filter) || 0);
                }
            }
            if (search) {
                const searchIdx = params.length + 1;
                if (type === 'client_payment_history') {
                    conditions.push(`(CAST(cph.id AS TEXT) ILIKE $${searchIdx} OR cph.notes ILIKE $${searchIdx} OR c.name ILIKE $${searchIdx})`);
                } else if (type === 'subcontractor_statements') {
                    conditions.push(`(CAST(ss.id AS TEXT) ILIKE $${searchIdx} OR ss.details ILIKE $${searchIdx} OR ss.sub_name ILIKE $${searchIdx})`);
                } else {
                    conditions.push(`(CAST(${prefix}id AS TEXT) ILIKE $${searchIdx})`);
                }
                params.push(`%${search}%`);
            }

            // --- 🌟 RLS & Data Isolation Injection 🌟 ---
            const userRole = (req.user.role || '').toLowerCase();
            const normalizedUsername = (req.user.username || '').toLowerCase().trim();
            const isAdmin = req.user.isSuperAdmin || userRole.includes('admin') || normalizedUsername === 'admin';

            const linkedProj = req.user && req.user.linkedProject;

            const scope = resolveScope(req.user);
            if (scope) {
                const isolationFilter = buildCompanyFilter(type, scope, prefix);
                if (isolationFilter) {
                    conditions.push(isolationFilter);
                }
            }

            if (linkedProj) {
                const p = linkedProj;
                if (type === 'projects') {
                    conditions.push(`${prefix}name = $${params.length + 1}`);
                    params.push(p);
                } else if (['purchase_orders', 'inventory_items', 'inventory_bookings', 'boq', 'subcontractor_items', 'material_usage', 'ar_invoices', 'inventory_sales', 'tasks', 'daily_reports'].includes(type)) {
                    if (type === 'subcontractor_items') {
                        conditions.push(`boq_id IN (SELECT id FROM boq WHERE project_name = $${params.length + 1})`);
                    } else if (type === 'inventory_sales') {
                        conditions.push(`(inventory_id IN (SELECT id FROM inventory_items WHERE project_name = $${params.length + 1}) OR project_id = (SELECT CAST(id AS varchar) FROM projects WHERE name = $${params.length + 1}) OR project_name = $${params.length + 1})`);
                    } else if (type === 'ar_invoices') {
                        conditions.push(`project_id IN (SELECT id FROM projects WHERE name = $${params.length + 1})`);
                    } else if (type === 'inventory_items') {
                        conditions.push(`${prefix}project_name = $${params.length + 1}`);
                    } else {
                        conditions.push(`project_name = $${params.length + 1}`);
                    }
                    params.push(p);
                } else if (type === 'ledger' || type === 'general_ledger') {
                    conditions.push(`cost_center = $${params.length + 1}`);
                    params.push(p);
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
            let skipInsert = (type === 'ledger' || type === 'general_ledger' || type === 'email_notifications');
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
                const calcFields = ['id', 'created_at', 'updated_at', 'items', 'item', 'charge_id', 'dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'partners_count', 'admins_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'waivePenalty', 'adjust_reason', 'adjust_qty', 'recipient', 'subject', 'body', 'attachment_content', 'attachment_filename', 'invoice_data'];
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

                // --- 🌟 Package 5 Supply Chain & Landed Cost Engine Interceptors (CBM Volume Proration) 🌟 ---
                if (type === 'shipment_expenses') {
                    const targetId = recordId;
                    const expRes = await client.query("SELECT * FROM shipment_expenses WHERE id = $1", [targetId]);
                    if (expRes.rows.length > 0) {
                        const exp = expRes.rows[0];
                        const amtIls = parseFloat(exp.amount || 0) * parseFloat(exp.exchange_rate_to_ils || 1);
                        await client.query("UPDATE shipment_expenses SET amount_ils = $1 WHERE id = $2", [amtIls, targetId]);

                        if (exp.shipment_id) {
                            await recalculateCBMProration(client, exp.shipment_id, req.user?.username);
                        }
                    }
                } else if (type === 'shipment_items') {
                    const targetId = recordId;
                    const itemRes = await client.query("SELECT * FROM shipment_items WHERE id = $1", [targetId]);
                    if (itemRes.rows.length > 0) {
                        const item = itemRes.rows[0];
                        const qty = parseFloat(item.quantity || 0);
                        const cbm = parseFloat(item.cbm_per_unit || 0.005);
                        const buyPrice = parseFloat(item.buy_price || 0);
                        const totalCbm = qty * cbm;
                        const totalBuy = qty * buyPrice;

                        await client.query("UPDATE shipment_items SET total_cbm = $1, total_buy_value = $2 WHERE id = $3", [totalCbm, totalBuy, targetId]);

                        if (item.shipment_id) {
                            await recalculateCBMProration(client, item.shipment_id, req.user?.username);
                        }
                    }
                } else if (type === 'pharma_shipments') {
                    const targetId = recordId;
                    const shipRes = await client.query("SELECT * FROM pharma_shipments WHERE id = $1", [targetId]);
                    if (shipRes.rows.length > 0) {
                        const ship = shipRes.rows[0];
                        const meta = ship.metadata || {};
                        if (ship.status === 'Arrived_Gaza_Warehouse' && !meta.gl_posted) {
                            const landedCostIls = parseFloat(ship.landed_cost_ils || 0);
                            if (landedCostIls > 0) {
                                await AccountingService.logEntry(client, 'مخزون الأدوية والمستلزمات - بريميميد فارما', 'غزة - المستودع الرئيسي', landedCostIls, 0, `رسملة وإثبات وصول بضاعة بالطريق لمخازن غزة | شحنة رقم: ${ship.shipment_no || ship.id}`, req.user?.username || 'System', `SHP-${ship.id}`, null, 'PharmaSupplyChain', null, false, null, 4, 'PRIMEMED PHARMA');
                                await AccountingService.logEntry(client, 'بضاعة بالطريق - شحنات مصر', 'غزة - المستودع الرئيسي', 0, landedCostIls, `إقفال حساب بضاعة بالطريق وإثبات وصول الشحنة لمخازن غزة | شحنة رقم: ${ship.shipment_no || ship.id}`, req.user?.username || 'System', `SHP-${ship.id}`, null, 'PharmaSupplyChain', null, false, null, 4, 'PRIMEMED PHARMA');
                                
                                // Loop through all shipment_items and insert into inventory_items & inventory_movements
                                const itemsRes = await client.query("SELECT * FROM shipment_items WHERE shipment_id = $1 AND is_deleted = false", [ship.id]);
                                for (const item of itemsRes.rows) {
                                    const qty = parseFloat(item.quantity || 0);
                                    const unitCost = parseFloat(item.landed_unit_cost_ils || 0);
                                    if (qty > 0) {
                                        const invRes = await client.query("SELECT id, quantity, remaining_qty, avg_cost FROM inventory_items WHERE item_name = $1 AND company_id = 4 AND warehouse = 'غزة - المستودع الرئيسي'", [item.item_name]);
                                        let invId;
                                        if (invRes.rows.length > 0) {
                                            const existing = invRes.rows[0];
                                            const oldQty = parseFloat(existing.quantity || 0);
                                            const oldAvg = parseFloat(existing.avg_cost || 0);
                                            const newTotalQty = oldQty + qty;
                                            const newAvgCost = newTotalQty > 0 ? (((oldQty * oldAvg) + (qty * unitCost)) / newTotalQty) : unitCost;
                                            
                                            await client.query("UPDATE inventory_items SET quantity = quantity + $1, remaining_qty = remaining_qty + $1, avg_cost = $2, unit_cost = $3 WHERE id = $4", [qty, newAvgCost, unitCost, existing.id]);
                                            invId = existing.id;
                                        } else {
                                            const newInv = await client.query(`INSERT INTO inventory_items (item_name, quantity, remaining_qty, buy_price, avg_cost, unit_cost, warehouse, batch_no, expiry_date, company_id, metadata)
                                                VALUES ($1, $2, $2, $3, $3, $3, 'غزة - المستودع الرئيسي', $4, $5, 4, '{"source":"PharmaSupplyChain"}') RETURNING id`,
                                                [item.item_name, qty, unitCost, item.batch_no, item.expiry_date]);
                                            invId = newInv.rows[0].id;
                                        }

                                        await client.query(`INSERT INTO inventory_movements (inventory_id, movement_type, from_warehouse, to_warehouse, qty, notes)
                                            VALUES ($1, 'Shipment_Receipt', 'مستودعات مصر - بضاعة بالطريق', 'غزة - المستودع الرئيسي', $2, $3)`,
                                            [invId, qty, `استلام شحنة دولية رقم ${ship.shipment_no || ship.id} وتقييمها بالتكلفة الحدية (CBM Proration)`]);
                                    }
                                }

                                meta.gl_posted = true;
                                await client.query("UPDATE pharma_shipments SET metadata = $1 WHERE id = $2", [JSON.stringify(meta), targetId]);
                            }
                        }
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

            if (type === 'ledger' || type === 'general_ledger') {
                let debitAmt = cleanNumeric(data.debit);
                let creditAmt = cleanNumeric(data.credit);
                if (data.transaction_type === 'Debit') {
                    debitAmt = cleanNumeric(data.amount);
                    creditAmt = 0;
                } else if (data.transaction_type === 'Credit') {
                    debitAmt = 0;
                    creditAmt = cleanNumeric(data.amount);
                }

                let comp = data.company;
                let compId = data.company_id;
                if (!comp && (data.account_name?.includes('تأمين') || data.account_name?.includes('عيادات') || data.account_name?.includes('أدوية') || data.description?.includes('صيدلية') || data.description?.includes('عيادة') || data.description?.includes('أدوية') || data.description?.includes('صرف') || data.cost_center?.includes('صرف') || data.cost_center?.includes('صيدلية'))) {
                    comp = 'PRIMEMED PHARMA';
                    compId = 4;
                }

                let finalAccountName = data.account_name;
                if (compId === 4 || comp === 'PRIMEMED PHARMA') {
                    if (finalAccountName?.includes('صندوق') || finalAccountName?.includes('نقدية')) finalAccountName = 'صندوق نقدية - بريميميد فارما';
                    else if (finalAccountName?.includes('بنك')) finalAccountName = 'بنك فلسطين - بريميميد فارما';
                    else if (finalAccountName?.includes('إيرادات')) finalAccountName = 'إيرادات مبيعات الصيدلية والأدوية - بريميميد فارما';
                    else if (finalAccountName?.includes('تكلفة')) finalAccountName = 'تكلفة مبيعات الأدوية والمستلزمات - بريميميد فارما';
                    else if (finalAccountName?.includes('مخزون') || finalAccountName?.includes('بضاعة')) finalAccountName = 'مخزون الأدوية والمستلزمات - بريميميد فارما';
                    else if (finalAccountName?.includes('عملاء')) finalAccountName = 'عملاء (حسابات مدينة - AR)';
                }

                await AccountingService.logEntry(client, finalAccountName, data.cost_center || data.project_name || 'General', debitAmt, creditAmt, data.description || 'حركة مالية', req.user.username, data.reference_id || data.reference_no, null, 'PharmaInventory', null, false, null, compId, comp);
            }

            if (type === 'email_notifications') {
                let attachments = null;
                if (data.invoice_data) {
                    try {
                        const pdfBuffer = await generateInvoicePDF(data.invoice_data);
                        attachments = [{
                            filename: `Invoice_${data.invoice_data.documentNo || 'Document'}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }];
                    } catch (pdfErr) {
                        console.error("🔥 [PDF Generation Error]:", pdfErr);
                        if (data.attachment_content) {
                            attachments = [{ filename: data.attachment_filename || 'Invoice_Document.txt', content: data.attachment_content }];
                        }
                    }
                } else if (data.attachment_content) {
                    attachments = [{
                        filename: data.attachment_filename || 'Invoice_Document.txt',
                        content: data.attachment_content
                    }];
                }
                await sendEmailNotification(data.recipient || 'ahmedzidan2013@gmail.com, Mo@fekra.studio', data.subject || 'إشعار نظام Ted ERP', data.body || 'حركة جديدة', true, attachments);
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

            const adjustReasonStr = data.adjust_reason ? ` | سبب التسوية: ${data.adjust_reason}` : '';
            const calcFields = ['id', 'created_at', 'updated_at', 'items', 'item', 'admins_count', 'remaining_budget', 'charge_id', 'dynamic_act_qty', 'assigned_qty', 'unassigned_qty', 'issued_invoices', 'proj_budget', 'proj_exp_amt', 'proj_act_amt', 'deposits', 'withdrawals', 'customer_name_readonly', 'sub_name', 'form_type', 'partners_count', 'project_company', 'project_name_temp', 'item_id', 'invoice_id', 'ddp_added_amount', 'ddp_lcy_added_amount', 'po_original_qty', 'po_unit_cost_fcy', 'po_ddp_added', 'po_ddp_lcy_added', 'current_outstanding', 'client_name', 'inventory_name', 'orig_inst_no', 'orig_unit_no', 'total_revenue', 'mgmt_fees', 'waivePenalty', 'adjust_reason', 'adjust_qty', 'recipient', 'subject', 'body', 'attachment_content', 'attachment_filename', 'invoice_data'];
            calcFields.forEach(f => delete data[f]);

            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
            const query = `UPDATE ${type} SET ${setClause} WHERE id = $${keys.length + 1}`;
            console.log(`📝 [DynamicController] Executing Update: ${query}`, values, id);
            await client.query(query, [...values, id]);

            // --- 🌟 Package 5 Supply Chain & Landed Cost Engine Interceptors (CBM Volume Proration) 🌟 ---
            if (type === 'shipment_expenses') {
                const targetId = id;
                const expRes = await client.query("SELECT * FROM shipment_expenses WHERE id = $1", [targetId]);
                if (expRes.rows.length > 0) {
                    const exp = expRes.rows[0];
                    const amtIls = parseFloat(exp.amount || 0) * parseFloat(exp.exchange_rate_to_ils || 1);
                    await client.query("UPDATE shipment_expenses SET amount_ils = $1 WHERE id = $2", [amtIls, targetId]);

                    if (exp.shipment_id) {
                        await recalculateCBMProration(client, exp.shipment_id, req.user?.username);
                    }
                }
            } else if (type === 'shipment_items') {
                const targetId = id;
                const itemRes = await client.query("SELECT * FROM shipment_items WHERE id = $1", [targetId]);
                if (itemRes.rows.length > 0) {
                    const item = itemRes.rows[0];
                    const qty = parseFloat(item.quantity || 0);
                    const cbm = parseFloat(item.cbm_per_unit || 0.005);
                    const buyPrice = parseFloat(item.buy_price || 0);
                    const totalCbm = qty * cbm;
                    const totalBuy = qty * buyPrice;

                    await client.query("UPDATE shipment_items SET total_cbm = $1, total_buy_value = $2 WHERE id = $3", [totalCbm, totalBuy, targetId]);

                    if (item.shipment_id) {
                        await recalculateCBMProration(client, item.shipment_id, req.user?.username);
                    }
                }
            } else if (type === 'pharma_shipments') {
                const targetId = (typeof id !== 'undefined' ? id : recordId);
                const shipRes = await client.query("SELECT * FROM pharma_shipments WHERE id = $1", [targetId]);
                if (shipRes.rows.length > 0) {
                    const ship = shipRes.rows[0];
                    const meta = ship.metadata || {};
                    if (ship.status === 'Arrived_Gaza_Warehouse' && !meta.gl_posted) {
                        const landedCostIls = parseFloat(ship.landed_cost_ils || 0);
                        if (landedCostIls > 0) {
                            await AccountingService.logEntry(client, 'مخزون الأدوية والمستلزمات - بريميميد فارما', 'غزة - المستودع الرئيسي', landedCostIls, 0, `رسملة وإثبات وصول بضاعة بالطريق لمخازن غزة | شحنة رقم: ${ship.shipment_no || ship.id}`, req.user?.username || 'System', `SHP-${ship.id}`, null, 'PharmaSupplyChain', null, false, null, 4, 'PRIMEMED PHARMA');
                            await AccountingService.logEntry(client, 'بضاعة بالطريق - شحنات مصر', 'غزة - المستودع الرئيسي', 0, landedCostIls, `إقفال حساب بضاعة بالطريق وإثبات وصول الشحنة لمخازن غزة | شحنة رقم: ${ship.shipment_no || ship.id}`, req.user?.username || 'System', `SHP-${ship.id}`, null, 'PharmaSupplyChain', null, false, null, 4, 'PRIMEMED PHARMA');
                            
                            // Loop through all shipment_items and insert into inventory_items & inventory_movements
                            const itemsRes = await client.query("SELECT * FROM shipment_items WHERE shipment_id = $1 AND is_deleted = false", [ship.id]);
                            for (const item of itemsRes.rows) {
                                const qty = parseFloat(item.quantity || 0);
                                const unitCost = parseFloat(item.landed_unit_cost_ils || 0);
                                if (qty > 0) {
                                    const invRes = await client.query("SELECT id, quantity, remaining_qty, avg_cost FROM inventory_items WHERE item_name = $1 AND company_id = 4 AND warehouse = 'غزة - المستودع الرئيسي'", [item.item_name]);
                                    let invId;
                                    if (invRes.rows.length > 0) {
                                        const existing = invRes.rows[0];
                                        const oldQty = parseFloat(existing.quantity || 0);
                                        const oldAvg = parseFloat(existing.avg_cost || 0);
                                        const newTotalQty = oldQty + qty;
                                        const newAvgCost = newTotalQty > 0 ? (((oldQty * oldAvg) + (qty * unitCost)) / newTotalQty) : unitCost;
                                        
                                        await client.query("UPDATE inventory_items SET quantity = quantity + $1, remaining_qty = remaining_qty + $1, avg_cost = $2, unit_cost = $3 WHERE id = $4", [qty, newAvgCost, unitCost, existing.id]);
                                        invId = existing.id;
                                    } else {
                                        const newInv = await client.query(`INSERT INTO inventory_items (item_name, quantity, remaining_qty, buy_price, avg_cost, unit_cost, warehouse, batch_no, expiry_date, company_id, metadata)
                                            VALUES ($1, $2, $2, $3, $3, $3, 'غزة - المستودع الرئيسي', $4, $5, 4, '{"source":"PharmaSupplyChain"}') RETURNING id`,
                                            [item.item_name, qty, unitCost, item.batch_no, item.expiry_date]);
                                        invId = newInv.rows[0].id;
                                    }

                                    await client.query(`INSERT INTO inventory_movements (inventory_id, movement_type, from_warehouse, to_warehouse, qty, notes)
                                        VALUES ($1, 'Shipment_Receipt', 'مستودعات مصر - بضاعة بالطريق', 'غزة - المستودع الرئيسي', $2, $3)`,
                                        [invId, qty, `استلام شحنة دولية رقم ${ship.shipment_no || ship.id} وتقييمها بالتكلفة الحدية (CBM Proration)`]);
                                }
                            }

                            meta.gl_posted = true;
                            await client.query("UPDATE pharma_shipments SET metadata = $1 WHERE id = $2", [JSON.stringify(meta), targetId]);
                        }
                    }
                }
            }

            await logAdvancedAudit(client, req.user.username, type, id, 'UPDATE', `Updated record in ${type}${adjustReasonStr}`, oldData, data);
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

            // Reversal of Accounting ledger entries
            if (type === 'client_payment_history') {
                await client.query("UPDATE ledger SET is_deleted = true, description = description || ' (Reversed)' WHERE reference_no = $1 OR reference_no = $2", [`COL-${id}`, oldData.reference_no]);
            } else if (type === 'subcontractor_statements') {
                await client.query("UPDATE ledger SET is_deleted = true, description = description || ' (Reversed)' WHERE reference_no = $1 OR reference_no = $2", [`PMT-${id}`, oldData.reference_no]);
                const meta = typeof oldData.metadata === 'string' ? JSON.parse(oldData.metadata) : (oldData.metadata || {});
                const invoiceId = meta.invoice_id;
                if (invoiceId) {
                    const paidRes = await client.query(`
                        SELECT COALESCE(SUM(amount), 0) AS total_paid
                        FROM subcontractor_statements
                        WHERE is_deleted = false
                          AND type = 'صرف مستخلص'
                          AND (CASE WHEN metadata->>'invoice_id' ~ '^[0-9]+$' THEN (metadata->>'invoice_id')::integer ELSE NULL END) = $1
                    `, [invoiceId]);
                    const totalPaid = parseFloat(paidRes.rows[0].total_paid || 0);

                    const invRes = await client.query("SELECT net_amount FROM subcontractor_invoices WHERE id = $1", [invoiceId]);
                    if (invRes.rows.length > 0) {
                        const netAmount = parseFloat(invRes.rows[0].net_amount || 0);
                        const newStatus = totalPaid >= netAmount ? 'Paid' : 'Approved';
                        await client.query("UPDATE subcontractor_invoices SET status = $1 WHERE id = $2", [newStatus, invoiceId]);
                    }
                }
            }

            if (type === 'shipment_expenses' || type === 'shipment_items') {
                if (oldData.shipment_id) {
                    await recalculateCBMProration(client, oldData.shipment_id, req.user?.username);
                }
            }

            // Trigger Project Financial Sync
            let projectIdToSync = null;
            if (type === 'client_payment_history' && oldData.project_id) {
                projectIdToSync = oldData.project_id;
            } else if (type === 'subcontractor_statements') {
                const meta = typeof oldData.metadata === 'string' ? JSON.parse(oldData.metadata) : (oldData.metadata || {});
                const pName = meta.project_name;
                if (pName) {
                    const pRes = await client.query("SELECT id FROM projects WHERE name = $1 LIMIT 1", [pName]);
                    if (pRes.rows.length > 0) {
                        projectIdToSync = pRes.rows[0].id;
                    }
                }
            }

            if (projectIdToSync) {
                const projRes = await client.query("SELECT name, budget FROM projects WHERE id = $1::integer", [projectIdToSync]);
                if (projRes.rows.length > 0) {
                    const { name: projectName, budget } = projRes.rows[0];
                    const ledgerRes = await client.query(`
                        SELECT 
                            COALESCE(SUM(CASE WHEN c.account_type = 'Revenue' THEN (CAST(l.credit AS NUMERIC) - CAST(l.debit AS NUMERIC)) ELSE 0 END), 0) as total_revenue,
                            COALESCE(SUM(CASE WHEN c.account_type = 'Expense' THEN (CAST(l.debit AS NUMERIC) - CAST(l.credit AS NUMERIC)) ELSE 0 END), 0) as total_expenses
                        FROM ledger l
                        JOIN chart_of_accounts c ON l.account_name = c.account_name
                        WHERE l.cost_center = $1::text AND l.is_deleted = false
                    `, [projectName]);
                    const { total_revenue, total_expenses } = ledgerRes.rows[0];
                    const actualProfit = (parseFloat(total_revenue) || 0) - (parseFloat(total_expenses) || 0);
                    const numBudget = parseFloat(budget) || 0;

                    await client.query(`
                        UPDATE projects 
                        SET actual_profit = $1::numeric, 
                            actual_profit_percent = CASE WHEN $2::numeric > 0 THEN ($1::numeric / $2::numeric * 100) ELSE 0 END
                        WHERE id = $3::integer
                    `, [actualProfit, numBudget, projectIdToSync]);

                    await logAudit(req.user?.username || 'System', 'SYNC_FINANCIALS', 'projects', projectIdToSync, `تمت إعادة مزامنة البيانات المالية للمشروع: ${projectName} بعد حذف الحركة`);
                }
            }

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
