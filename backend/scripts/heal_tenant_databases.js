const pg = require('pg');

const tenantDbs = [
    { db: 'erp_db', company: 'Central Database' },
    { db: 'erp_ted_capital', company: 'TED Capital' },
    { db: 'erp_design_concept', company: 'Design Concept' },
    { db: 'erp_primemed_pharma', company: 'PRIMEMED PHARMA' },
    { db: 'erp_master_builder', company: 'Master Builder' }
];

async function heal() {
    const config = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        password: String(process.env.DB_PASS || process.env.DB_PASSWORD || '1985'),
        port: process.env.DB_PORT || 5432,
    };

    console.log("Healing unique constraints in all tenant databases...");

    for (const tenant of tenantDbs) {
        console.log(`\n--- Healing Database: ${tenant.db} ---`);
        const client = new pg.Client({ ...config, database: tenant.db });
        try {
            await client.connect();
            
            // 1. users (username)
            try {
                await client.query('ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)');
                console.log(`✅ Added UNIQUE constraint users_username_key to ${tenant.db}`);
            } catch (err) {
                console.log(`ℹ️ users_username_key: ${err.message}`);
            }

            // 2. system_backups (backup_name)
            try {
                await client.query('ALTER TABLE system_backups ADD CONSTRAINT system_backups_backup_name_key UNIQUE (backup_name)');
                console.log(`✅ Added UNIQUE constraint system_backups_backup_name_key to ${tenant.db}`);
            } catch (err) {
                console.log(`ℹ️ system_backups_backup_name_key: ${err.message}`);
            }

            // 3. backups_log (name)
            try {
                await client.query('ALTER TABLE backups_log ADD CONSTRAINT backups_log_name_key UNIQUE (name)');
                console.log(`✅ Added UNIQUE constraint backups_log_name_key to ${tenant.db}`);
            } catch (err) {
                console.log(`ℹ️ backups_log_name_key: ${err.message}`);
            }

        } catch (err) {
            console.error(`❌ Failed to connect to ${tenant.db}:`, err.message);
        } finally {
            await client.end();
        }
    }
    console.log("\nDone healing database constraints!");
    process.exit(0);
}

heal();
