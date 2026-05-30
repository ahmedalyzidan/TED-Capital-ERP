require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("Adding columns to crm_leads for Real Estate integration...");

        await client.query(`
            ALTER TABLE crm_leads 
            ADD COLUMN IF NOT EXISTS preferred_project_id INTEGER REFERENCES real_estate_projects(id) ON DELETE SET NULL
        `);

        await client.query(`
            ALTER TABLE crm_leads 
            ADD COLUMN IF NOT EXISTS preferred_unit_id INTEGER REFERENCES real_estate_units(id) ON DELETE SET NULL
        `);

        await client.query(`
            ALTER TABLE crm_leads 
            ADD COLUMN IF NOT EXISTS budget NUMERIC(15,2) DEFAULT 0
        `);

        await client.query(`
            ALTER TABLE crm_leads 
            ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 50
        `);

        await client.query(`
            ALTER TABLE crm_leads 
            ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP
        `);

        console.log("Creating crm_opportunities and crm_interactions if they do not exist...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS crm_opportunities (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES crm_leads(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                expected_value NUMERIC(15,2),
                probability INTEGER CHECK (probability BETWEEN 0 AND 100),
                stage VARCHAR(50) DEFAULT 'Qualification',
                expected_closing_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS crm_interactions (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES crm_leads(id) ON DELETE CASCADE,
                type VARCHAR(50), 
                notes TEXT,
                interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(100)
            )
        `);

        await client.query('COMMIT');
        console.log("Migration executed successfully.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
