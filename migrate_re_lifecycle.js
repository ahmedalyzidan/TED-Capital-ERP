const pool = require('./backend/config/db');

async function migrateRE() {
    try {
        console.log("🚀 Migrating Real Estate Module to Enterprise Grade...");

        // 1. Unit Lifecycle History
        await pool.query(`
            CREATE TABLE IF NOT EXISTS real_estate_unit_history (
                id SERIAL PRIMARY KEY,
                unit_id INTEGER REFERENCES real_estate_units(id) ON DELETE CASCADE,
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                action_by VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Add paid_amount to installments if not exists
        await pool.query("ALTER TABLE real_estate_installments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0");
        await pool.query("ALTER TABLE real_estate_installments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP");
        await pool.query("ALTER TABLE real_estate_installments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)");
        await pool.query("ALTER TABLE real_estate_installments ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100)");

        console.log("✅ Real Estate Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateRE();
