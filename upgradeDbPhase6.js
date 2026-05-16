require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function upgradeDb() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("Starting Phase 6 Database Upgrade...");

        // 1. Inventory Upgrades
        console.log("Upgrading Inventory schema...");
        await client.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(100)`);
        await client.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100)`);
        await client.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE`);
        await client.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location_bin VARCHAR(100)`);
        await client.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC DEFAULT 0`);
        await client.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0`);

        await client.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0`);
        await client.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS taxes_amount NUMERIC DEFAULT 0`);

        // 2. Sales Commissions
        console.log("Creating Sales Commissions schema...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS sales_commissions (
                id SERIAL PRIMARY KEY,
                staff_id INT,
                source_type VARCHAR(50), -- 'Inventory' or 'RealEstate'
                source_id INT, -- ID of the sale or contract
                amount NUMERIC DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Paid'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Real Estate Module
        console.log("Creating Real Estate schema...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS real_estate_projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100), -- 'Factory', 'Villa', 'Building'
                location TEXT,
                total_units INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Under Construction',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS real_estate_units (
                id SERIAL PRIMARY KEY,
                project_id INT REFERENCES real_estate_projects(id),
                unit_number VARCHAR(100),
                type VARCHAR(100), -- 'Apartment', 'Shop', 'Villa'
                area NUMERIC DEFAULT 0,
                floor INT,
                price NUMERIC DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Sold', 'Reserved'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS real_estate_contracts (
                id SERIAL PRIMARY KEY,
                unit_id INT REFERENCES real_estate_units(id),
                customer_name VARCHAR(255),
                customer_phone VARCHAR(100),
                total_price NUMERIC DEFAULT 0,
                down_payment NUMERIC DEFAULT 0,
                installment_years INT DEFAULT 0,
                contract_date DATE,
                status VARCHAR(50) DEFAULT 'Active',
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Partners & Shareholders Module
        console.log("Creating Partners schema...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS partners (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100), -- 'Investment', 'Management', 'Both'
                investment_percentage NUMERIC DEFAULT 0, -- % of profit based on capital
                management_percentage NUMERIC DEFAULT 0, -- % of profit based on effort/management
                total_capital NUMERIC DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS partner_transactions (
                id SERIAL PRIMARY KEY,
                partner_id INT REFERENCES partners(id),
                type VARCHAR(100), -- 'Capital Injection', 'Withdrawal', 'Profit Distribution'
                amount NUMERIC DEFAULT 0,
                date DATE,
                description TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('COMMIT');
        console.log("Phase 6 Database Upgrade Completed Successfully!");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Upgrade failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

upgradeDb();
