const pool = require('./backend/config/db');

async function migrateManufacturing() {
    try {
        console.log("🚀 Migrating Manufacturing Module to Enterprise Grade...");

        // 1. BOM Headers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bom_headers (
                id SERIAL PRIMARY KEY,
                product_name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                standard_cost NUMERIC(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. BOM Items (Recipes)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bom_items (
                id SERIAL PRIMARY KEY,
                bom_id INTEGER REFERENCES bom_headers(id) ON DELETE CASCADE,
                item_name VARCHAR(255) NOT NULL, -- Raw material name
                required_qty NUMERIC(12,4) NOT NULL,
                waste_factor NUMERIC(5,2) DEFAULT 0, -- Percentage
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Work Orders
        await pool.query(`
            CREATE TABLE IF NOT EXISTS work_orders (
                id SERIAL PRIMARY KEY,
                bom_id INTEGER REFERENCES bom_headers(id),
                wo_number VARCHAR(50) UNIQUE NOT NULL,
                target_qty NUMERIC(12,2) NOT NULL,
                produced_qty NUMERIC(12,2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Planned', -- Planned, In-Progress, Completed, Cancelled
                start_date DATE,
                end_date DATE,
                project_name VARCHAR(255), -- For cost allocation
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Production Logs (Actual Usage)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS production_logs (
                id SERIAL PRIMARY KEY,
                wo_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
                material_name VARCHAR(255),
                qty_used NUMERIC(12,4),
                labor_cost NUMERIC(15,2) DEFAULT 0,
                overhead_cost NUMERIC(15,2) DEFAULT 0,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("✅ Manufacturing Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateManufacturing();
