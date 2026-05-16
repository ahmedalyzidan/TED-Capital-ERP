const pool = require('./backend/config/db');

async function migrateLogistics() {
    try {
        console.log("🚀 Migrating Logistics Module to Enterprise Grade...");

        // 1. Inventory Transfers Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_transfers (
                id SERIAL PRIMARY KEY,
                inventory_item_id INTEGER REFERENCES inventory_items(id),
                from_warehouse_id INTEGER REFERENCES warehouses(id),
                to_warehouse_id INTEGER REFERENCES warehouses(id),
                qty NUMERIC(12,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending', -- Pending, In-Transit, Completed
                transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                received_date TIMESTAMP,
                created_by VARCHAR(100),
                notes TEXT
            )
        `);

        // 2. Add warehouse_id to inventory_items
        await pool.query("ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id)");
        
        // 3. Seed default warehouse if empty
        const whCheck = await pool.query("SELECT id FROM warehouses LIMIT 1");
        if (whCheck.rows.length === 0) {
            await pool.query("INSERT INTO warehouses (name, location) VALUES ('Main Warehouse', 'Cairo Headquarters'), ('Site Store A', 'Project Site Alpha')");
        }

        console.log("✅ Logistics Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateLogistics();
