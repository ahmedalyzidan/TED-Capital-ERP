const pool = require('./backend/config/db');

async function migrateSupplyChain() {
    try {
        console.log("🚀 Migrating Supply Chain Module to Enterprise Grade...");

        // 1. LC (Letter of Credit) Registry
        await pool.query(`
            CREATE TABLE IF NOT EXISTS po_lc_registry (
                id SERIAL PRIMARY KEY,
                lc_number VARCHAR(100) UNIQUE NOT NULL,
                po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
                bank_name VARCHAR(255),
                lc_amount NUMERIC(15,2),
                currency VARCHAR(10),
                expiry_date DATE,
                status VARCHAR(50) DEFAULT 'Active', -- Active, Expired, Utilized
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Supplier Performance Ratings
        await pool.query(`
            CREATE TABLE IF NOT EXISTS supplier_ratings (
                id SERIAL PRIMARY KEY,
                supplier_name VARCHAR(255) UNIQUE NOT NULL,
                quality_score NUMERIC(3,2) DEFAULT 5.0,
                delivery_score NUMERIC(3,2) DEFAULT 5.0,
                price_consistency_score NUMERIC(3,2) DEFAULT 5.0,
                total_pos_completed INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Add LC reference to POs
        await pool.query("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS lc_id INTEGER REFERENCES po_lc_registry(id)");

        console.log("✅ Supply Chain Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateSupplyChain();
