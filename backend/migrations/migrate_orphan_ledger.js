const pool = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔓 Disabling ledger vault trigger...");
    await client.query('ALTER TABLE ledger DISABLE TRIGGER trg_ledger_vault;');
    
    console.log("📝 Updating orphan ledger records...");
    const res = await client.query(`
      UPDATE ledger 
      SET account_name = 'صندوق نقدية - تيد كابيتال' 
      WHERE account_name = 'نقدية بالبنوك والصندوق';
    `);
    console.log(`Updated ${res.rowCount} entries.`);
    
    console.log("🔒 Re-enabling ledger vault trigger...");
    await client.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_vault;');
    
    console.log(`\n✅ Migration successful: Updated orphan ledger entries to 'صندوق نقدية - تيد كابيتال'.`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    try {
      console.log("🔒 Trying to re-enable ledger vault trigger in catch block...");
      await client.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_vault;');
    } catch (e) {
      console.error("Could not re-enable trigger:", e);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
