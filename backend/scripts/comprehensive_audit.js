
const { Client } = require('pg');
require('dotenv').config();
const axios = require('axios');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:your_secure_password@db:5432/erp_db'
});

async function runSystemAudit() {
    console.log("🚀 INITIALIZING COMPREHENSIVE ERP AUDIT [STAGING] 🚀");
    const report = {
        database: {},
        financial: {},
        fullstack: {},
        security: {},
        timestamp: new Date().toISOString()
    };

    try {
        await client.connect();
        
        // 1. Database Audit
        console.log("--- 🗄️ Database Audit ---");
        const tables = ['users', 'accounts', 'journal_entries', 'projects', 'purchase_orders', 'inventory', 'warehouses'];
        for (const table of tables) {
            const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
            report.database[table] = { count: parseInt(res.rows[0].count), status: '✅ OK' };
            console.log(`Table '${table}': ${res.rows[0].count} records.`);
        }

        // 2. Financial Integrity (Referential)
        console.log("\n--- 📊 Financial Integrity Audit ---");
        const orphans = await client.query(`
            SELECT COUNT(*) FROM journal_entries 
            WHERE debit_account_id NOT IN (SELECT id FROM accounts)
            OR credit_account_id NOT IN (SELECT id FROM accounts)
        `);
        const orphanCount = parseInt(orphans.rows[0].count);
        report.financial.integrity = orphanCount === 0 ? '✅ CLEAN' : `❌ FAILED (${orphanCount} orphans)`;
        console.log(`Financial Integrity: ${report.financial.integrity}`);

        // 3. API & Full Stack Check (Internal)
        console.log("\n--- 🌐 Full Stack API Check ---");
        try {
            const apiRes = await axios.get('http://localhost:4000/api/health'); // Assume health endpoint
            report.fullstack.api = '✅ ONLINE';
        } catch (e) {
            report.fullstack.api = '⚠️ Health endpoint unreachable (Testing root...)';
            try {
                await axios.get('http://localhost:4000/');
                report.fullstack.api = '✅ ROOT ONLINE';
            } catch (e2) {
                report.fullstack.api = '❌ OFFLINE';
            }
        }
        console.log(`API Status: ${report.fullstack.api}`);

        // 4. Security Check
        console.log("\n--- 🔐 Security Audit ---");
        const usersWithWeakPasswords = await client.query(`SELECT COUNT(*) FROM users WHERE password IS NULL OR LENGTH(password) < 8`);
        report.security.weak_passwords = parseInt(usersWithWeakPasswords.rows[0].count);
        console.log(`Users with weak/null passwords: ${report.security.weak_passwords}`);

        // Output Final Report
        console.log("\n==========================================");
        console.log("📝 FINAL AUDIT REPORT GENERATED");
        console.log(JSON.stringify(report, null, 2));
        console.log("==========================================");

    } catch (err) {
        console.error("❌ AUDIT CRASHED:", err.message);
    } finally {
        await client.end();
    }
}

runSystemAudit();
