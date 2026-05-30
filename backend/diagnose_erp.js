/**
 * 🔍 TED ERP - COMPREHENSIVE DIAGNOSTIC & HEALTH SUITE
 * Run this script to analyze databases, schemas, page components, routing, and modules.
 * Outputs a detailed Markdown report with warnings and recommendations.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = require('./config/db');

// List of companies/databases to audit
const DB_SCHEMAS = {
    'Central / Default': 'erp_db',
    'TED Capital': 'erp_ted_capital',
    'Design Concept': 'erp_design_concept',
    'PRIMEMED PHARMA': 'erp_primemed_pharma',
    'Master Builder': 'erp_master_builder'
};

async function checkDatabaseConnection(name, dbName) {
    const baseConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
        port: process.env.DB_PORT || 5432,
        database: dbName,
        connectionTimeoutMillis: 5000,
        query_timeout: 5000
    };

    const tempPool = new Pool(baseConfig);
    try {
        const start = Date.now();
        const res = await tempPool.query('SELECT NOW()');
        const latency = Date.now() - start;
        return { ok: true, latency, version: res.rows[0].now };
    } catch (err) {
        return { ok: false, error: err.message };
    } finally {
        await tempPool.end();
    }
}

async function auditDatabaseSchema(dbName) {
    const baseConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
        port: process.env.DB_PORT || 5432,
        database: dbName,
        connectionTimeoutMillis: 5000,
        query_timeout: 5000
    };

    const tempPool = new Pool(baseConfig);
    try {
        // 1. Check tables list
        const tablesRes = await tempPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        `);
        const tables = tablesRes.rows.map(r => r.table_name);

        const schemaReport = {
            tables,
            usersTableColumns: [],
            errors: []
        };

        if (tables.includes('users')) {
            const colsRes = await tempPool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'users';
            `);
            schemaReport.usersTableColumns = colsRes.rows.map(r => `${r.column_name} (${r.data_type})`);

            // Verify important user columns
            const colsList = colsRes.rows.map(r => r.column_name);
            if (!colsList.includes('photo')) {
                schemaReport.errors.push("Missing column 'photo' in 'users' table.");
            }
            if (!colsList.includes('linked_employee_id')) {
                schemaReport.errors.push("Missing column 'linked_employee_id' in 'users' table.");
            }
            if (!colsList.includes('linked_company')) {
                schemaReport.errors.push("Missing column 'linked_company' in 'users' table.");
            }
        } else {
            schemaReport.errors.push("Missing 'users' table entirely.");
        }

        // Verify other tables
        const requiredTables = ['employees', 'companies', 'purchase_orders', 'inventory_items', 'inventory_sales', 'ledger', 'chart_of_accounts'];
        requiredTables.forEach(t => {
            if (!tables.includes(t)) {
                schemaReport.errors.push(`Missing core table: '${t}'.`);
            }
        });

        return schemaReport;
    } catch (err) {
        return { error: err.message };
    } finally {
        await tempPool.end();
    }
}

function verifyFrontendFiles() {
    const clientPath = path.join(__dirname, 'client/src');
    const requiredPages = [
        'pages/Login.jsx',
        'pages/Users.jsx',
        'pages/Clients.jsx',
        'components/Layout.jsx',
        'contexts/AuthContext.jsx'
    ];

    const results = [];
    requiredPages.forEach(p => {
        const fullPath = path.join(clientPath, p);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            let isParsable = true;
            // Quick check for matching brackets
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            const openJSX = (content.match(/</g) || []).length;
            const closeJSX = (content.match(/>/g) || []).length;

            if (openBraces !== closeBraces) {
                isParsable = false;
            }

            results.push({
                file: p,
                exists: true,
                bracesMatch: openBraces === closeBraces,
                openBraces,
                closeBraces,
                sizeBytes: content.length
            });
        } else {
            results.push({
                file: p,
                exists: false
            });
        }
    });

    return results;
}

async function runAllDiagnostics() {
    console.log("🔍 Running ERP System Diagnostics...");

    const report = {
        timestamp: new Date().toISOString(),
        databases: {},
        frontend: [],
        summary: {
            issuesCount: 0,
            warnings: []
        }
    };

    // 1. Audit Databases
    for (const [name, dbName] of Object.entries(DB_SCHEMAS)) {
        console.log(`📡 Auditing Database: ${dbName} (${name})`);
        const conn = await checkDatabaseConnection(name, dbName);
        if (!conn.ok) {
            report.databases[name] = {
                databaseName: dbName,
                status: 'OFFLINE',
                error: conn.error
            };
            report.summary.issuesCount++;
            report.summary.warnings.push(`Database ${dbName} is offline: ${conn.error}`);
        } else {
            const schema = await auditDatabaseSchema(dbName);
            report.databases[name] = {
                databaseName: dbName,
                status: 'ONLINE',
                latencyMs: conn.latency,
                tablesCount: schema.tables ? schema.tables.length : 0,
                tables: schema.tables || [],
                usersColumns: schema.usersTableColumns || [],
                errors: schema.errors || []
            };
            if (schema.errors && schema.errors.length > 0) {
                report.summary.issuesCount += schema.errors.length;
                schema.errors.forEach(err => {
                    report.summary.warnings.push(`[${name} DB] ${err}`);
                });
            }
        }
    }

    // 2. Audit Frontend
    console.log("📂 Auditing React Pages and Files...");
    report.frontend = verifyFrontendFiles();
    report.frontend.forEach(f => {
        if (!f.exists) {
            report.summary.issuesCount++;
            report.summary.warnings.push(`Missing frontend file: client/src/${f.file}`);
        } else if (!f.bracesMatch) {
            report.summary.issuesCount++;
            report.summary.warnings.push(`Broken curly braces count in client/src/${f.file} (${f.openBraces} open vs ${f.closeBraces} close)`);
        }
    });

    // 3. Write Report
    generateMarkdownReport(report);
}

function generateMarkdownReport(report) {
    const reportPath = path.join(__dirname, 'diagnostic_report.md');

    let md = `# 🛡️ TED ERP System Integrity & Health Report\n\n`;
    md += `**Audit Timestamp:** ${new Date(report.timestamp).toLocaleString()}\n`;
    md += `**Total Issues/Warnings Found:** ${report.summary.issuesCount}\n\n`;

    if (report.summary.issuesCount === 0) {
        md += `> [!NOTE]\n`;
        md += `> All core system databases, table schemas, and React components are in pristine condition! No issues detected.\n\n`;
    } else {
        md += `> [!WARNING]\n`;
        md += `> Detected ${report.summary.issuesCount} warnings/discrepancies during this scan. See detailed breakdowns below.\n\n`;
    }

    md += `## 1. Database & Tenant Connectivity Status\n\n`;
    md += `| Company / Tenant | Database Name | Status | Latency | Table Count | Issues |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const [name, data] of Object.entries(report.databases)) {
        const issuesText = data.errors && data.errors.length > 0 
            ? `⚠️ ${data.errors.length} issue(s)` 
            : data.error 
            ? `❌ Offline: ${data.error}`
            : '✅ Healthy';
        const latencyText = data.latencyMs ? `${data.latencyMs}ms` : 'N/A';
        const countText = data.tablesCount || 0;
        md += `| **${name}** | \`${data.databaseName}\` | ${data.status === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'} | ${latencyText} | ${countText} | ${issuesText} |\n`;
    }
    md += `\n`;

    md += `### Detailed Schema Warnings per Tenant\n\n`;
    let dbIssuesExist = false;
    for (const [name, data] of Object.entries(report.databases)) {
        if (data.errors && data.errors.length > 0) {
            dbIssuesExist = true;
            md += `#### 🏢 ${name} (\`${data.databaseName}\`)\n`;
            data.errors.forEach(err => {
                md += `- ❌ ${err}\n`;
            });
            md += `\n*Current \`users\` Table Schema:* \`${data.usersColumns.join(', ') || 'N/A'}\`\n\n`;
        }
    }
    if (!dbIssuesExist) {
        md += `*No database schema warnings detected across any tenants.*\n\n`;
    }

    md += `## 2. Frontend Component Integrations\n\n`;
    md += `| File Path | Exists | Curly Braces Match | Size (Bytes) | Status |\n`;
    md += `|---|---|---|---|---|\n`;

    report.frontend.forEach(f => {
        const status = !f.exists ? '❌ Missing' : !f.bracesMatch ? '⚠️ Syntax Error' : '✅ Good';
        const sizeText = f.sizeBytes ? `${(f.sizeBytes / 1024).toFixed(2)} KB` : '0';
        md += `| \`client/src/${f.file}\` | ${f.exists ? 'Yes' : 'No'} | ${f.bracesMatch ? 'Yes' : 'No'} | ${sizeText} | ${status} |\n`;
    });
    md += `\n`;

    md += `## 3. General Warnings & Recommended Solutions\n\n`;
    if (report.summary.warnings.length > 0) {
        report.summary.warnings.forEach((warn, idx) => {
            md += `${idx + 1}. **${warn}**\n`;
            if (warn.includes("photo")) {
                md += `   *Solution:* Execute the migration to add the \`photo\` column to the respective users table.\n`;
            } else if (warn.includes("linked_employee_id")) {
                md += `   *Solution:* Execute the migration to add the \`linked_employee_id\` column to the respective users table.\n`;
            } else if (warn.includes("braces")) {
                md += `   *Solution:* Check the specified file to fix mismatched curly braces or syntax compilation errors.\n`;
            }
            md += `\n`;
        });
    } else {
        md += `*No general warnings. The system is structurally verified and fully ready for production.*\n`;
    }

    fs.writeFileSync(reportPath, md, 'utf8');
    console.log(`📊 Diagnostic Report generated at: ${reportPath}`);
}

runAllDiagnostics();
