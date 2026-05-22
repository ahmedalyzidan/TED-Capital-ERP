const pool = require('../config/db');

async function migrate() {
    console.log("🚀 Running migration: Add email column to subcontractors table...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        await client.query(`
            ALTER TABLE subcontractors 
            ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        `);
        
        await client.query("COMMIT");
        console.log("✅ Migration completed: email column added to subcontractors table.");
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
