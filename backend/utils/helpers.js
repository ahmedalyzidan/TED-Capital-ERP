const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

const getPgExe = (exeName) => {
    const ext = process.platform === 'win32' ? '.exe' : '';
    // دعم مسار مخصص عبر متغيرات البيئة لبيئات السيرفرات المختلفة (Linux/Docker/Windows)
    if (process.env.PG_BIN_PATH) return `"${path.join(process.env.PG_BIN_PATH, exeName + ext)}"`;
    
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
        if (fs.existsSync(fullPath)) return `"${fullPath}"`;
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
// --- ADVANCED AUDIT TRAIL (Tracks Old vs New Values) ---
// =====================================================================
const logAdvancedAudit = async (poolOrClient, username, tableName, recordId, action, details, oldData = null, newData = null) => {
    try {
        let changesStr = details;

        if (action === 'UPDATE' && oldData && newData) {
            let changes = [];
            for (let key in newData) {
                if (oldData[key] !== undefined && String(oldData[key]) !== String(newData[key])) {
                    if(key !== 'updated_at' && key !== 'timestamp') {
                        changes.push(`[${key}] changed from '${oldData[key]}' to '${newData[key]}'`);
                    }
                }
            }
            if (changes.length > 0) {
                changesStr = changes.join(' | ');
            } else {
                changesStr = "Updated without changing mapped values.";
            }
        }

        const query = `
            INSERT INTO audit_logs (username, action, table_name, record_id, details, timestamp)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;
        // استخدام poolOrClient ليدعم الـ Transactions أو الاتصال العادي
        await poolOrClient.query(query, [username, action, tableName, recordId, changesStr]);
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

// تم التعديل لدعم الـ Transactions عبر المعامل client وتنظيف القيم الرقمية
async function autoLedgerEntry(client, accountName, costCenter, debit, credit, desc, user) {
    const cleanDebit = cleanNumeric(debit);
    const cleanCredit = cleanNumeric(credit);
    if (cleanDebit === 0 && cleanCredit === 0) return;
    
    await client.query(
        "INSERT INTO ledger (account_name, cost_center, debit, credit, description, created_by) VALUES ($1, $2, $3, $4, $5, $6)", 
        [accountName, costCenter, cleanDebit, cleanCredit, desc, user]
    );
}

async function syncProjectFinancials(projectName, client) {
    if (!projectName || projectName === 'undefined') return;
    try {
        const projRes = await client.query("SELECT budget, expected_profit_percent, actual_profit_percent FROM projects WHERE name = $1", [projectName]);
        if (projRes.rows.length > 0) {
            const budget = Number(projRes.rows[0].budget) || 0; 
            const expPct = Number(projRes.rows[0].expected_profit_percent) || 0;
            const actPct = Number(projRes.rows[0].actual_profit_percent) || 0;
            const expAmt = budget * (expPct / 100);
            const actAmt = budget * (actPct / 100);
            await client.query("UPDATE partners SET expected_return = ROUND(CAST((share_percent / 100.0) * $1 AS NUMERIC), 2), actual_profit = ROUND(CAST((share_percent / 100.0) * $2 AS NUMERIC), 2) WHERE project_name = $3", [expAmt, actAmt, projectName]);
        }
    } catch(err) { console.error("Sync Error:", err.message); }
}

const logAudit = async (username, action, tableName, recordId, details) => {
    try {
        await pool.query(
            "INSERT INTO audit_logs (username, action, table_name, record_id, details, timestamp) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)",
            [username, action, tableName, recordId, details]
        );
    } catch (e) { console.error('Audit Log Error:', e); }
};

module.exports = { getPgExe, getDbUrl, cleanNumeric, cleanString, cleanDate, logAudit, logAdvancedAudit, autoLedgerEntry, syncProjectFinancials };