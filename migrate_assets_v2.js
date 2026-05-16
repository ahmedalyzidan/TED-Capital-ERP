const pool = require('./backend/config/db');

async function migrateAssets() {
    try {
        console.log("🚀 Migrating Fixed Assets to Enterprise Grade...");

        // 1. Asset Categories
        await pool.query(`
            CREATE TABLE IF NOT EXISTS asset_categories (
                id SERIAL PRIMARY KEY,
                category_name VARCHAR(255) UNIQUE NOT NULL,
                useful_life_months INTEGER NOT NULL,
                depreciation_method VARCHAR(50) DEFAULT 'Straight-line', -- Straight-line, Declining
                dep_expense_account_id VARCHAR(50), -- Link to COA
                accum_dep_account_id VARCHAR(50),   -- Link to COA
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Fixed Assets
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fixed_assets (
                id SERIAL PRIMARY KEY,
                asset_code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                category_id INTEGER REFERENCES asset_categories(id),
                purchase_date DATE NOT NULL,
                purchase_cost NUMERIC(15,2) NOT NULL,
                scrap_value NUMERIC(15,2) DEFAULT 0,
                current_book_value NUMERIC(15,2),
                location_id VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Active',
                qr_code TEXT,
                is_deleted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Depreciation Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS asset_depreciation_logs (
                id SERIAL PRIMARY KEY,
                asset_id INTEGER REFERENCES fixed_assets(id),
                period VARCHAR(20), -- MM-YYYY
                amount NUMERIC(15,2),
                book_value_after NUMERIC(15,2),
                jv_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed some categories if empty
        const catCheck = await pool.query("SELECT id FROM asset_categories LIMIT 1");
        if (catCheck.rows.length === 0) {
            await pool.query(`
                INSERT INTO asset_categories (category_name, useful_life_months, depreciation_method, dep_expense_account_id, accum_dep_account_id)
                VALUES 
                ('Machinery & Equipment', 120, 'Straight-line', '6000', '1000'),
                ('Vehicles', 60, 'Straight-line', '6000', '1000'),
                ('IT Equipment', 36, 'Straight-line', '6000', '1000'),
                ('Office Furniture', 60, 'Straight-line', '6000', '1000')
            `);
        }

        console.log("✅ Fixed Assets Migration Completed.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrateAssets();
