const pool = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("🔓 Disabling ledger vault trigger...");
    await client.query('ALTER TABLE ledger DISABLE TRIGGER trg_ledger_vault;');
    
    console.log("📝 Updating orphan subcontractor and client ledger records...");
    
    const updates = [
      { old: 'عملاء عقود مقاولات - أرصدة مدينة', new: 'عملاء (حسابات مدينة - AR)' },
      { old: 'إيرادات عقود مقاولات وإنشاءات', new: 'إيرادات مستخلصات وخدمات' },
      { old: 'مقاولون من الباطن - أرصدة دائنة', new: 'مقاولي الباطن' },
      { old: 'تكلفة أعمال مقاولين', new: 'تكلفة مقاولي الباطن' },
      { old: 'ضريبة القيمة المضافة', new: 'ضريبة القيمة المضافة (VAT 14%)' },
      { old: 'ضريبة القيمة المضافة - مدخلات', new: 'ضريبة القيمة المضافة (VAT 14%)' }
    ];

    for (const update of updates) {
      const res = await client.query(
        `UPDATE ledger SET account_name = $1 WHERE account_name = $2`,
        [update.new, update.old]
      );
      console.log(`Updated '${update.old}' -> '${update.new}': ${res.rowCount} rows`);
    }
    
    console.log("🔒 Re-enabling ledger vault trigger...");
    await client.query('ALTER TABLE ledger ENABLE TRIGGER trg_ledger_vault;');
    
    console.log(`\n✅ Migration successful.`);
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
