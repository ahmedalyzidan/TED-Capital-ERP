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
    if (!projectId) return;
    try {
        const projRes = await client.query("SELECT budget, expected_profit_percent, actual_profit_percent FROM projects WHERE id = $1", [projectId]);
        if (projRes.rows.length > 0) {
            const budget = Number(projRes.rows[0].budget) || 0; 
            const expPct = Number(projRes.rows[0].expected_profit_percent) || 0;
            const actPct = Number(projRes.rows[0].actual_profit_percent) || 0;
            
            const expAmt = budget * (expPct / 100);
            const actAmt = budget * (actPct / 100);
            
            // تحديث جدول الشركاء بناءً على الـ ID بدلاً من الاسم لضمان الدقة
            await client.query(
                `UPDATE partners 
                 SET expected_return = ROUND(CAST((share_percent / 100.0) * $1 AS NUMERIC), 2), 
                     actual_profit = ROUND(CAST((share_percent / 100.0) * $2 AS NUMERIC), 2) 
                 WHERE project_id = $3`, 
                [expAmt, actAmt, projectId]
            );
        }
    } catch(err) { console.error("Sync Error:", err.message); }
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
    validatePasswordStrength 
};