const pool = require('../config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("🔒 Establishing the 'Ledger Vault' - Database-Level Protection...");

        // 1. Create the protection function
        // This function will raise an exception if any UPDATE or DELETE is attempted on the protected table
        await client.query(`
            CREATE OR REPLACE FUNCTION fn_protect_ledger_integrity()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = 'DELETE') THEN
                    RAISE EXCEPTION '❌ [SECURITY BREACH] Manual deletion from the Ledger is strictly prohibited by IFRS policies.';
                ELSIF (TG_OP = 'UPDATE') THEN
                    -- Allow updating only the 'reconciled' or 'audit' flags if absolutely necessary, 
                    -- but block changes to financial values (debit/credit/account)
                    IF (OLD.debit != NEW.debit OR OLD.credit != NEW.credit OR OLD.account_code != NEW.account_code) THEN
                        RAISE EXCEPTION '❌ [SECURITY BREACH] Modification of financial values in existing Ledger entries is prohibited. Use Contra Entries instead.';
                    END IF;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 2. Attach the trigger to the ledger table
        await client.query(`
            DROP TRIGGER IF EXISTS trg_ledger_vault ON ledger;
            CREATE TRIGGER trg_ledger_vault
            BEFORE UPDATE OR DELETE ON ledger
            FOR EACH ROW
            EXECUTE FUNCTION fn_protect_ledger_integrity();
        `);

        // 3. Optional: Protect the system_events (Audit) table too
        await client.query(`
            CREATE OR REPLACE FUNCTION fn_protect_audit_logs()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION '❌ [SECURITY BREACH] Audit trails are immutable and cannot be altered or removed.';
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_audit_vault ON audit_logs;
            CREATE TRIGGER trg_audit_vault
            BEFORE UPDATE OR DELETE ON audit_logs
            FOR EACH ROW
            EXECUTE FUNCTION fn_protect_audit_logs();
        `);

        await client.query('COMMIT');
        console.log("✅ Ledger Vault established successfully. Financial records are now protected at the kernel level.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", err.message);
    } finally {
        client.release();
    }
}

migrate();
