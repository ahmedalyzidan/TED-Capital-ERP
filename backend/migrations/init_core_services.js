const pool = require('../config/db');

async function migrate() {
    console.log("🚀 Ensuring Core ERP Services Schema...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. User Preferences
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                language VARCHAR(10) DEFAULT 'ar',
                theme_mode VARCHAR(20) DEFAULT 'light',
                date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
                sidebar_collapsed BOOLEAN DEFAULT FALSE,
                dashboard_layout JSONB DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. System Events
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                source_module VARCHAR(50) NOT NULL,
                payload JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query("ALTER TABLE system_events ADD COLUMN IF NOT EXISTS source_module VARCHAR(50)");

        // 3. Notifications
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                link VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. System Backups & Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_backups (
                id SERIAL PRIMARY KEY,
                backup_name VARCHAR(255) UNIQUE NOT NULL,
                file_path TEXT NOT NULL,
                backup_type VARCHAR(20) NOT NULL,
                size_bytes BIGINT,
                status VARCHAR(20) DEFAULT 'SUCCESS',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Manual check for backup_name uniqueness
        try { await client.query("ALTER TABLE system_backups ADD CONSTRAINT sys_backup_unique UNIQUE (backup_name)"); } catch(e){}

        await client.query(`
            CREATE TABLE IF NOT EXISTS backups_log (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE,
                size VARCHAR(50),
                source VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        try { await client.query("ALTER TABLE backups_log ADD CONSTRAINT backup_log_unique UNIQUE (name)"); } catch(e){}

        // 5. Audit Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                table_name VARCHAR(100) NOT NULL,
                record_id INTEGER NOT NULL,
                action VARCHAR(20) NOT NULL,
                old_data JSONB,
                new_data JSONB,
                user_id INTEGER REFERENCES users(id),
                username VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query("COMMIT");
        console.log("✅ Core ERP Services Schema Ensured.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration Failed:", err.message);
    } finally {
        client.release();
    }
}

migrate();
module.exports = migrate;
