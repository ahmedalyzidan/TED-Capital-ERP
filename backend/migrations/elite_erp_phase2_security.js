const pool = require('../config/db');

async function migrate() {
    console.log("🚀 Implementing Elite Enterprise Standard Phase 2: Security & Integrity...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Security Matrix Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS elite_security_matrix (
                id SERIAL PRIMARY KEY,
                role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
                module_name VARCHAR(100) NOT NULL,
                screen_name VARCHAR(100) NOT NULL,
                action_name VARCHAR(100) NOT NULL, -- View, Create, Edit, Delete, Authorize, Void, Print
                is_allowed BOOLEAN DEFAULT FALSE,
                financial_limit DECIMAL(15,2) DEFAULT 0, -- Limit for Checker/Authorizer
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, module_name, screen_name, action_name)
            )
        `);

        // 2. Add Authorization & Versioning Fields to Inventory
        const tablesToUpdate = ['inventory_items', 'purchase_orders', 'ar_invoices', 'ledger'];
        for (const table of tablesToUpdate) {
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS authorized_by VARCHAR(100)`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS authorization_date TIMESTAMP`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS version_id INTEGER DEFAULT 1`);
        }

        // 3. IFRS Contra Entry Support for Ledger
        await client.query(`ALTER TABLE ledger ADD COLUMN IF NOT EXISTS is_contra BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE ledger ADD COLUMN IF NOT EXISTS original_entry_id INTEGER REFERENCES ledger(id)`);
        await client.query(`ALTER TABLE ledger ADD COLUMN IF NOT EXISTS reversal_reason TEXT`);

        // 4. Soft Deletion & Audit Fields for major operational tables if missing
        const operationalTables = ['customers', 'projects', 'subcontractors', 'real_estate_units', 'installments'];
        for (const table of operationalTables) {
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100)`);
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS version_id INTEGER DEFAULT 1`);
        }

        // 5. Hierarchy Support (Multi-Entity Tracking)
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_project_id INTEGER REFERENCES projects(id)`);

        await client.query("COMMIT");
        console.log("✅ Elite ERP Phase 2 Security Schema Successfully Implemented.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration Failed:", err.message);
    } finally {
        client.release();
    }
}

migrate();
module.exports = migrate;
