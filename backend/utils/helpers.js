const path = require('path');
const fs = require('fs');
// التأكد من استيراد قاعدة البيانات بشكل صحيح
const pool = require('../config/db'); 

const getPgExe = (exeName) => {
    const ext = process.platform === 'win32' ? '.exe' : '';
    if (process.env.PG_BIN_PATH) return path.join(process.env.PG_BIN_PATH, exeName + ext);
    
    const commonPaths = [
        'C:\\Program Files\\PostgreSQL\\18\\bin',
        'C:\\Program Files\\PostgreSQL\\17\\bin',
        'C:\\Program Files\\PostgreSQL\\16\\bin',
        'C:\\Program Files\\PostgreSQL\\15\\bin',
        'C:\\Program Files\\PostgreSQL\\14\\bin',
        'C:\\Program Files\\PostgreSQL\\13\\bin',
        'C:\\Program Files\\PostgreSQL\\12\\bin'
    ];
    for (const p of commonPaths) {
        const fullPath = path.join(p, exeName + ext);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return exeName; 
};

const getDbUrl = () => {
    const user = encodeURIComponent(process.env.DB_USER || 'postgres');
    const pass = encodeURIComponent(process.env.DB_PASS || '1985');
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const db = process.env.DB_DATABASE || 'erp_db';
    return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
};

const cleanNumeric = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
const cleanString = (v) => (v === '' || v === undefined) ? null : v;
const cleanDate = (v) => (v === '' || v === undefined) ? null : v;

// =====================================================================
// --- ADVANCED AUDIT TRAIL (Tracks Old vs New Values & Reversals/Deletions) ---
// =====================================================================
const logAdvancedAudit = async (poolOrClient, username, tableName, recordId, action, details, oldData = null, newData = null) => {
    try {
        let changesStr = details;

        if (action === 'UPDATE' && oldData && newData) {
            let changes = [];
            for (let key in newData) {
                if (oldData[key] !== undefined && String(oldData[key]) !== String(newData[key])) {
                    if(key !== 'updated_at' && key !== 'timestamp' && key !== 'created_at') {
                        changes.push(`[${key}] changed from '${oldData[key]}' to '${newData[key]}'`);
                    }
                }
            }
            changesStr = changes.length > 0 ? changes.join(' | ') : "Updated without changing mapped values.";
        } else if (['SOFT_DELETE', 'DELETE', 'DELETE_PO', 'REVERSAL', 'CANCEL', 'REFUND'].includes(action) && oldData) {
            let stateSnapshot = [];
            for (let key in oldData) {
                if (oldData[key] !== undefined && oldData[key] !== null && key !== 'updated_at' && key !== 'timestamp') {
                    stateSnapshot.push(`[${key}]: ${oldData[key]}`);
                }
            }
            changesStr = `${details} | Before Reversal/Deletion Snapshot: { ${stateSnapshot.join(', ')} }`;

            // Trigger high-priority security audit event for anti-fraud monitoring
            try {
                const secQuery = `
                    INSERT INTO security_audit_trail 
                    (username, action, resource, impact_level, details, created_at, timestamp, event_type) 
                    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $2)
                `;
                await poolOrClient.query(secQuery, [username, action, `${tableName}#${recordId}`, 'High', { message: details, snapshot: oldData }]);
            } catch (secErr) {
                console.error('Security Audit Event Error in logAdvancedAudit:', secErr);
            }
        }

        const query = `
            INSERT INTO audit_logs (username, action, table_name, record_id, details, timestamp)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;
        await poolOrClient.query(query, [username, action, tableName, recordId, changesStr]);
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

const logAudit = async (username, action, tableName, recordId, details) => {
    try {
        await pool.query(
            "INSERT INTO audit_logs (username, action, table_name, record_id, details, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)",
            [username, action, tableName, recordId, details]
        );
    } catch (e) { console.error('Audit Log Error:', e); }
};

const logSecurityEvent = async (username, action, resource, impactLevel, details) => {
    try {
        const detailsObj = typeof details === 'object' ? details : { message: details };
        await pool.query(
            `INSERT INTO security_audit_trail 
            (username, action, resource, impact_level, details, created_at, timestamp, event_type) 
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $2)`,
            [username, action, resource, impactLevel, detailsObj]
        );
    } catch (e) { console.error('Security Audit Error:', e); }
};

// =====================================================================
// --- 🌟 تحديث جذري: التوجيه المحاسبي الآلي لنظام القيد المزدوج 🌟 ---
// =====================================================================
const AccountingService = require('../services/accountingService');

/**
 * تقوم هذه الدالة بإصدار قيد يومية مزدوج عبر محرك الحسابات المركزي
 * لتحديث دفتر الأستاذ العام (Ledger) بشكل متوازن وآمن.
 */
async function autoLedgerEntry(client, debitAccountId, creditAccountId, amount, projectId, desc, user) {
    const cleanAmount = cleanNumeric(amount);
    if (cleanAmount <= 0) return null; 

    // حماية الفترات المالية المقفلة
    const isPeriodClosed = process.env.SYSTEM_LOCKED === 'true';
    if (isPeriodClosed) {
        throw new Error("لا يمكن ترحيل هذا القيد: الفترة المالية الحالية مغلقة.");
    }
    
    if (!debitAccountId || !creditAccountId) {
        console.warn("⚠️ تم تجاهل القيد: حساب المدين أو الدائن مفقود.");
        return null;
    }

    // استخدام محرك الحسابات المركزي لضمان توازن القيد وصحة التوجيه
    const result = await AccountingService.recordDoubleEntry(client, {
        debitAccount: debitAccountId, 
        creditAccount: creditAccountId, 
        amount: cleanAmount,
        description: desc || 'قيد آلي من النظام',
        username: user || 'System',
        sourceModule: 'Assets'
    });

    // نعيد الـ debitId كمعرف للقيد للربط في سجلات الإهلاك
    return result?.debitId || null;
}

// =====================================================================
// --- مزامنة أرباح الشركاء والمشاريع ---
// =====================================================================
async function syncProjectFinancials(projectId, client) {
    if (!projectId) return null;
    try {
        let numericId = projectId;
        let projectName = projectId;
        if (isNaN(projectId) || String(projectId).trim() === '') {
            const projLookup = await client.query("SELECT id, name FROM projects WHERE name = $1 LIMIT 1", [projectId]);
            if (projLookup.rows.length > 0) {
                numericId = projLookup.rows[0].id;
                projectName = projLookup.rows[0].name;
            } else {
                return null;
            }
        } else {
            const projLookup = await client.query("SELECT name FROM projects WHERE id = $1 LIMIT 1", [projectId]);
            if (projLookup.rows.length > 0) {
                projectName = projLookup.rows[0].name;
            } else {
                return null;
            }
        }

        // 1. حساب الإجماليات من دفتر اليومية (Ledger) باستثناء المحذوف
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

        // 2. جلب ميزانية المشروع وحساب نسبة الربح الفعلي
        const projRes = await client.query("SELECT budget FROM projects WHERE id = $1", [numericId]);
        const budget = projRes.rows.length > 0 ? (Number(projRes.rows[0].budget) || 0) : 0;

        await client.query(`
            UPDATE projects 
            SET actual_profit = $1::numeric, 
                actual_profit_percent = CASE WHEN $2::numeric > 0 THEN ($1::numeric / $2::numeric * 100) ELSE 0 END
            WHERE id = $3::integer
        `, [actualProfit, budget, numericId]);

        return { actualProfit, total_revenue, total_expenses };
    } catch(err) {
        console.error("Sync Project Financials Error:", err.message);
        return null;
    }
}

// =====================================================================
// --- INVENTORY VALUATION: Moving Average (المتوسط المرجح) ---
// =====================================================================
const calculateMovingAverage = (currentQty, currentAvgPrice, newQty, newUnitPrice) => {
    const cQty = cleanNumeric(currentQty);
    const cPrice = cleanNumeric(currentAvgPrice);
    const nQty = cleanNumeric(newQty);
    const nPrice = cleanNumeric(newUnitPrice);

    if (nQty <= 0) return cPrice; 
    if (cQty <= 0) return nPrice; 

    const totalCurrentValue = cQty * cPrice;
    const totalNewValue = nQty * nPrice;
    const newTotalQty = cQty + nQty;

    const movingAverage = (totalCurrentValue + totalNewValue) / newTotalQty;
    
    return Number(movingAverage.toFixed(2));
};

// 🌟 دالة التحقق من قوة كلمة المرور (Password Strength Validation)
const validatePasswordStrength = (password) => {
    if (!password) return null; // Allow empty if not changing
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) return "كلمة المرور يجب أن لا تقل عن 8 أحرف.";
    if (!hasUpperCase || !hasLowerCase) return "يجب أن تحتوي كلمة المرور على أحرف كبيرة وصغيرة.";
    if (!hasNumbers) return "يجب أن تحتوي كلمة المرور على أرقام على الأقل.";
    if (!hasSpecialChar) return "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (e.g. !@#$).";
    
    return null; // كلمة المرور قوية
};

const resolveScope = (user) => {
    if (!user) return null;
    const username = (user.username || '').toUpperCase();
    const selected = user.selectedCompany;
    
    // Define default scope for restricted users
    let allowedNames = null;
    let allowedIds = null;
    
    if (username === 'MTAYEM') {
        allowedNames = ['TED Capital', 'PRIMEMED PHARMA', 'TED CAPITAL', 'Primemed Pharma', 'TED Capital ERP'];
        allowedIds = [1, 4];
    } else if (username === 'MSOBHI') {
        allowedNames = ['Design Concept', 'DESIGN CONCEPT', 'ديزاين كونسبت', 'ديزاين كونسيبت'];
        allowedIds = [2];
    }
    
    // If a specific company is selected, narrow down the scope
    if (selected && !['all', 'كل الشركات', 'all companies'].includes(selected.toLowerCase())) {
        const nameLower = selected.toLowerCase();
        let resolvedId = null;
        let resolvedName = null;
        
        if (nameLower.includes('design') || nameLower.includes('ديزاين')) {
            resolvedId = 2; resolvedName = 'Design Concept';
        } else if (nameLower.includes('master') || nameLower.includes('ماستر')) {
            resolvedId = 3; resolvedName = 'Master Builder';
        } else if (nameLower.includes('prime') || nameLower.includes('فارما') || nameLower.includes('بريم')) {
            resolvedId = 4; resolvedName = 'PRIMEMED PHARMA';
        } else if (nameLower.includes('ted') || nameLower.includes('تيد')) {
            resolvedId = 1; resolvedName = 'TED Capital';
        }
        
        if (resolvedId && resolvedName) {
            // If the user has restricted scope, verify they can select this company
            if (allowedIds && !allowedIds.includes(resolvedId)) {
                return { names: allowedNames, ids: allowedIds };
            }
            return { names: [resolvedName], ids: [resolvedId] };
        }
    }
    
    // If no specific company is selected, return their default scope (if any)
    if (allowedIds) {
        return { names: allowedNames, ids: allowedIds };
    }
    
    if (user.linkedCompany) {
        const nameLower = user.linkedCompany.toLowerCase();
        let resolvedId = null;
        let resolvedName = null;
        if (nameLower.includes('design') || nameLower.includes('ديزاين')) { resolvedId = 2; resolvedName = 'Design Concept'; }
        else if (nameLower.includes('master') || nameLower.includes('ماستر')) { resolvedId = 3; resolvedName = 'Master Builder'; }
        else if (nameLower.includes('prime') || nameLower.includes('فارما') || nameLower.includes('بريم')) { resolvedId = 4; resolvedName = 'PRIMEMED PHARMA'; }
        else if (nameLower.includes('ted') || nameLower.includes('تيد')) { resolvedId = 1; resolvedName = 'TED Capital'; }
        
        if (resolvedId && resolvedName) {
            return { names: [resolvedName], ids: [resolvedId] };
        }
    }
    
    return null; // Unrestricted (super admins who didn't select a company)
};

const buildCompanyFilter = async (type, scope, prefix = "") => {
    if (!scope || !scope.names || scope.names.length === 0 || !scope.ids || scope.ids.length === 0) {
        return null;
    }
    const escapedNames = scope.names.map(n => n.replace(/'/g, "''"));
    const namesSqlList = `(${escapedNames.map(n => `'${n}'`).join(', ')})`;
    const idsSqlList = `(${scope.ids.join(', ')})`;

    // Map table types to their respective company filters
    if (type === 'projects') {
        return `(${prefix}company IN ${namesSqlList} OR ${prefix}company_id IN ${idsSqlList})`;
    }
    if (type === 'staff' || type === 'employees' || type === 'rfq') {
        return `${prefix}company IN ${namesSqlList}`;
    }
    if (type === 'customers') {
        return `(${prefix}company_id IN ${idsSqlList} OR ${prefix}company_id IS NULL OR ${prefix}company_name IN ${namesSqlList})`;
    }

    // Query central DB for project names and IDs in scope to avoid empty local projects table filtering
    const { centralPool } = require('../config/db');
    let projectNames = [];
    let projectIds = [];
    try {
        const projRes = await centralPool.query(`SELECT id, name FROM projects WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList}`);
        projectNames = projRes.rows.map(r => r.name);
        projectIds = projRes.rows.map(r => r.id);
    } catch (err) {
        console.error("Error querying projects for company filter:", err.message);
    }

    const escapedProjNames = projectNames.map(p => p.replace(/'/g, "''"));
    const projNamesSqlList = escapedProjNames.length > 0 ? `(${escapedProjNames.map(p => `'${p}'`).join(', ')})` : `('')`;
    const projIdsSqlList = projectIds.length > 0 ? `(${projectIds.join(', ')})` : `(0)`;
    const projIdsStrSqlList = projectIds.length > 0 ? `(${projectIds.map(id => `'${id}'`).join(', ')})` : `('')`;

    if (type === 'purchase_orders') {
        return `(${prefix}project_name IN ${projNamesSqlList} OR ${prefix}warehouse IN ${namesSqlList} OR ${prefix}supplier IN ${namesSqlList})`;
    }
    if (type === 'inventory_items' || type === 'inventory') {
        return `(${prefix}project_name IN ${projNamesSqlList} OR ${prefix}warehouse IN ${namesSqlList} OR ${prefix}company_id IN ${idsSqlList} OR ${prefix}project_name IN ${namesSqlList})`;
    }
    if (type === 'inventory_sales') {
        return `(${prefix}project_id IN ${projIdsStrSqlList} OR ${prefix}company_id IN ${idsSqlList} OR ${prefix}project_name IN ${namesSqlList} OR ${prefix}inventory_id IN (SELECT id FROM inventory_items WHERE project_name IN ${projNamesSqlList} OR warehouse IN ${namesSqlList} OR company_id IN ${idsSqlList} OR project_name IN ${namesSqlList}))`;
    }
    if (type === 'ar_invoices') {
        return `(${prefix}project_id IN ${projIdsSqlList})`;
    }
    if (type === 'material_usage' || type === 'inventory_bookings') {
        return `(project_name IN ${projNamesSqlList} OR inventory_id IN (SELECT id FROM inventory_items WHERE warehouse IN ${namesSqlList} OR company_id IN ${idsSqlList}))`;
    }
    if (type === 'boq') {
        return `project_name IN ${projNamesSqlList}`;
    }
    if (type === 'subcontractor_items') {
        return `boq_id IN (SELECT id FROM boq WHERE project_name IN ${projNamesSqlList})`;
    }
    if (type === 'ledger' || type === 'general_ledger') {
        return `(${prefix}cost_center IN ${projNamesSqlList} OR ${prefix}cost_center IN ${namesSqlList} OR ${prefix}company IN ${namesSqlList} OR ${prefix}company_id IN ${idsSqlList})`;
    }
    if (type === 'subcontractors') {
        return `(id IN (SELECT subcontractor_id FROM subcontractor_contracts WHERE project_id IN ${projIdsSqlList}) OR company IN ${namesSqlList} OR company_id IN ${idsSqlList} OR project_id IN ${projIdsSqlList})`;
    }
    if (type === 'subcontractor_invoices') {
        return `(project_id IN ${projIdsSqlList})`;
    }
    if (type === 'partners' || type === 'tasks') {
        return `${prefix}project_name IN ${projNamesSqlList}`;
    }
    if (type === 'daily_reports' || type === 'work_orders' || type === 'vendor_bills') {
        return `(${prefix}project_name IN ${projNamesSqlList} OR ${prefix}project_id IN ${projIdsSqlList})`;
    }
    if (type === 'chart_of_accounts') {
        return `(company_entity IN ${namesSqlList} OR company_entity = 'All' OR company_id IN ${idsSqlList})`;
    }
    if (type === 'contracts') {
        return `(${prefix}project_name IN ${projNamesSqlList} OR ${prefix}project_id IN ${projIdsSqlList})`;
    }
    if (type === 'installments') {
        return `contract_id IN (SELECT id FROM contracts WHERE project_name IN ${projNamesSqlList} OR project_id IN ${projIdsSqlList})`;
    }
    if (type === 'payment_receipts') {
        return `installment_id IN (SELECT id FROM installments WHERE contract_id IN (SELECT id FROM contracts WHERE project_name IN ${projNamesSqlList} OR project_id IN ${projIdsSqlList}))`;
    }
    if (type === 'expenses') {
        return `(company_entity IN ${namesSqlList} OR company_id IN ${idsSqlList} OR project_id IN ${projIdsSqlList})`;
    }
    if (type === 'payroll') {
        return `(company_id IN ${idsSqlList} OR project_name IN ${projNamesSqlList})`;
    }
    if (type === 'leaves' || type === 'staff_advances') {
        return `staff_id IN (SELECT id FROM staff WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList})`;
    }
    if (type === 'intercompany_transactions') {
        return `(source_company_id IN ${idsSqlList} OR target_company_id IN ${idsSqlList})`;
    }
    if (type === 'property_units') {
        return `project_name IN ${projNamesSqlList}`;
    
    // --- Real Estate Module Isolation ---
    if (type === 'real_estate_projects') {
        return `(${prefix}company IN ${namesSqlList} OR ${prefix}company_id IN ${idsSqlList} OR ${prefix}company IS NULL)`;
    }
    if (type === 'real_estate_units') {
        return `(${prefix}project_id IN (SELECT id FROM real_estate_projects WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList}))`;
    }
    if (type === 'real_estate_contracts') {
        return `(${prefix}unit_id IN (SELECT id FROM real_estate_units WHERE project_id IN (SELECT id FROM real_estate_projects WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList})))`;
    }
    if (type === 'real_estate_installments') {
        return `(${prefix}contract_id IN (SELECT id FROM real_estate_contracts WHERE unit_id IN (SELECT id FROM real_estate_units WHERE project_id IN (SELECT id FROM real_estate_projects WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList}))))`;
    }
    if (type === 're_project_costs' || type === 're_unit_costs') {
        return `(${prefix}project_id IN (SELECT id FROM real_estate_projects WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList}))`;
    }
    if (type === 're_rental_contracts') {
        return `(${prefix}company IN ${namesSqlList} OR ${prefix}project_id IN (SELECT id FROM real_estate_projects WHERE company IN ${namesSqlList} OR company_id IN ${idsSqlList}))`;
    }
    if (type === 're_rental_invoices' || type === 're_rental_payments') {
        return `(${prefix}contract_id IN (SELECT id FROM re_rental_contracts WHERE company IN ${namesSqlList}))`;
    }

    // --- CRM Module Isolation ---
    if (['crm_appointments', 'crm_membership_plans', 'crm_memberships', 'crm_points', 'crm_client_attendance', 'crm_campaigns', 'crm_templates'].includes(type)) {
        return `${prefix}company IN ${namesSqlList}`;
    }

    // --- Sales Module Isolation ---
    if (['sales_quotations', 'sales_orders', 'sales_invoices', 'sales_pos_transactions', 'sales_offers', 'sales_price_lists', 'sales_insurance', 'sales_targets', 'sales_commissions', 'sales_installments', 'sales_delivery_notes', 'sales_return_orders'].includes(type)) {
        return `${prefix}company IN ${namesSqlList}`;
    }

    return null;
};

module.exports = { 
    getPgExe, 
    getDbUrl, 
    cleanNumeric, 
    cleanString, 
    cleanDate, 
    logAudit, 
    logAdvancedAudit,
    logSecurityEvent, 
    autoLedgerEntry, 
    syncProjectFinancials,
    calculateMovingAverage,
    validatePasswordStrength,
    resolveScope,
    buildCompanyFilter
};