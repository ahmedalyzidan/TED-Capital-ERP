const pool = require('../config/db');

async function migrate() {
    console.log("🚀 Running migration: Odoo-Style Sales & Inventory Controls Schema...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // 1. Add product type, costing method, and invoicing policy columns to inventory_items
        await client.query(`
            ALTER TABLE inventory_items 
            ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'Storable',
            ADD COLUMN IF NOT EXISTS costing_method VARCHAR(50) DEFAULT 'AVCO',
            ADD COLUMN IF NOT EXISTS invoicing_policy VARCHAR(50) DEFAULT 'Ordered';
        `);
        
        // 2. Create pricelists table
        await client.query(`
            CREATE TABLE IF NOT EXISTS pricelists (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                discount_percentage NUMERIC DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Create customer_pricelists mapping table
        await client.query(`
            CREATE TABLE IF NOT EXISTS customer_pricelists (
                customer_id INTEGER NOT NULL,
                pricelist_id INTEGER REFERENCES pricelists(id) ON DELETE CASCADE,
                PRIMARY KEY(customer_id, pricelist_id)
            );
        `);
        
        await client.query("COMMIT");
        console.log("✅ Migration completed: Sales & Inventory controls tables and columns added.");
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
