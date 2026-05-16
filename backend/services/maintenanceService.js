const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * MaintenanceService: Emergency Data Purge Engine
 */
class MaintenanceService {
    async recoverBackupRegistry() {
        const backupDir = path.join(__dirname, '../../uploads/backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const files = fs.readdirSync(backupDir);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const file of files) {
                if (file.endsWith('.backup')) {
                    const filePath = path.join(backupDir, file);
                    const stats = fs.statSync(filePath);
                    await client.query(`
                        INSERT INTO system_backups (backup_name, file_path, backup_type, size_bytes, status, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (backup_name) DO NOTHING
                    `, [file, filePath, 'RECOVERED', stats.size, 'SUCCESS', stats.mtime]);
                    await client.query(`
                        INSERT INTO backups_log (name, size, source)
                        VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING
                    `, [file, `${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'Recovery']);
                }
            }
            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    }

    async getPurgeableTables() {
        const sacred = [
            'users', 'user_preferences', 'system_parameters', 'chart_of_accounts', 
            'system_backups', 'backups_log', 'roles', 'permissions', 
            'role_permissions', 'user_roles', 'user_org_units', 'org_units'
        ];
        const allTablesRes = await pool.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
        return allTablesRes.rows.map(r => r.tablename).filter(t => !sacred.includes(t)).sort();
    }

    /**
     * EMERGENCY Global Reset: Wipes ALL business data with ZERO tolerance.
     */
    async secureReset(tenantId, confirmedBy, targetTables = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const sacred = [
                'users', 'user_preferences', 'system_parameters', 'chart_of_accounts', 
                'system_backups', 'backups_log', 'roles', 'permissions', 
                'role_permissions', 'user_roles', 'user_org_units', 'org_units'
            ];

            let tablesToPurge = [];
            if (targetTables && Array.isArray(targetTables) && targetTables.length > 0) {
                tablesToPurge = targetTables.filter(t => !sacred.includes(t));
            } else {
                const allTablesRes = await client.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
                tablesToPurge = allTablesRes.rows.map(r => r.tablename).filter(t => !sacred.includes(t));
            }

            for (const table of tablesToPurge) {
                try {
                    await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
                    await client.query(`DELETE FROM "${table}"`); 
                } catch (e) {
                    console.warn(`Table [${table}] purge warning: ${e.message}`);
                }
            }

            await client.query('COMMIT');
            return { success: true, message: `Purged ${tablesToPurge.length} tables successfully.` };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    }
}

module.exports = new MaintenanceService();
