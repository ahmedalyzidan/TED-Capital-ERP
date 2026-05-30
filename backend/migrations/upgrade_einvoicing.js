const pool = require('../config/db');

async function migrate() {
    console.log("🚀 Running migration: E-Invoicing Table Upgrades...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Upgrading ar_invoices (Fixed Assets / General AR)
        await client.query(`
            ALTER TABLE ar_invoices 
            ADD COLUMN IF NOT EXISTS einvoice_uuid VARCHAR(255),
            ADD COLUMN IF NOT EXISTS einvoice_status VARCHAR(50) DEFAULT 'Not_Submitted',
            ADD COLUMN IF NOT EXISTS einvoice_submission_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS einvoice_errors JSONB;
        `);

        // Upgrading sales_invoices (Sales Module / POS)
        await client.query(`
            ALTER TABLE sales_invoices 
            ADD COLUMN IF NOT EXISTS einvoice_uuid VARCHAR(255),
            ADD COLUMN IF NOT EXISTS einvoice_status VARCHAR(50) DEFAULT 'Not_Submitted',
            ADD COLUMN IF NOT EXISTS einvoice_submission_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS einvoice_errors JSONB;
        `);
        
        await client.query("COMMIT");
        console.log("✅ Migration completed: E-Invoicing columns added successfully.");
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
