const pool = require('../config/db');

async function migrate() {
    console.log("🚀 Running migration: Heavy Equipment & Maintenance Schema...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // 1. Create equipment operations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS equipment_operations (
                id SERIAL PRIMARY KEY,
                asset_id INTEGER REFERENCES fixed_assets(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                hourmeter_reading NUMERIC(12,2),
                odometer_reading NUMERIC(12,2),
                fuel_liters NUMERIC(10,2),
                fuel_cost NUMERIC(12,2),
                operator_name VARCHAR(255),
                project_name VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // 2. Create equipment maintenance table
        await client.query(`
            CREATE TABLE IF NOT EXISTS equipment_maintenance (
                id SERIAL PRIMARY KEY,
                asset_id INTEGER REFERENCES fixed_assets(id) ON DELETE CASCADE,
                service_date DATE NOT NULL,
                service_type VARCHAR(100), -- Preventive, Breakdown, Inspection
                description TEXT,
                service_cost NUMERIC(12,2) DEFAULT 0,
                parts_used TEXT,
                status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, In Progress, Completed
                completed_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await client.query("COMMIT");
        console.log("✅ Migration completed: Equipment & Maintenance tables created.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", err.message);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    migrate().then(() => pool.end()).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = migrate;
