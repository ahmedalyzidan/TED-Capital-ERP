const { exec, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

/**
 * World-Class Backup Service for Ted ERP
 * Handles Database Dumps, Restoration, and Registry Management
 */
class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../../uploads/backups');
        if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
    }

    async getBackups() {
        const res = await pool.query("SELECT * FROM system_backups ORDER BY created_at DESC");
        return res.rows;
    }

    async createBackup(type = 'MANUAL') {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `ted_erp_backup_${timestamp}.backup`;
            const filePath = path.join(this.backupDir, fileName);

            // Determine if we are in Docker or Local
            const isDocker = process.env.DB_HOST === 'db';
            let command = '';
            
            // PostgreSQL dump command
            if (isDocker) {
                command = `pg_dump -h db -U ${process.env.DB_USER} -F c ${process.env.DB_DATABASE} > "${filePath}"`;
            } else {
                const pgDumpPath = process.env.PG_BIN_PATH ? path.join(process.env.PG_BIN_PATH, 'pg_dump') : 'pg_dump';
                command = `"${pgDumpPath}" -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -p ${process.env.DB_PORT || 5432} -F c ${process.env.DB_DATABASE} > "${filePath}"`;
            }

            console.log(`🚀 Starting ${type} backup...`);

            exec(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASS || process.env.DB_PASSWORD } }, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Backup failed: ${error.message}`);
                    return reject(error);
                }

                try {
                    const stats = fs.statSync(filePath);
                    await pool.query(
                        "INSERT INTO system_backups (backup_name, file_path, backup_type, size_bytes, status) VALUES ($1, $2, $3, $4, $5)",
                        [fileName, filePath, type, stats.size, 'SUCCESS']
                    );
                    await pool.query(
                        "INSERT INTO backups_log (name, size, source) VALUES ($1, $2, $3)",
                        [fileName, `${(stats.size / 1024 / 1024).toFixed(2)} MB`, type]
                    );
                    console.log(`✅ Backup created: ${fileName}`);
                    resolve({ fileName, filePath, size: stats.size });
                } catch (dbErr) {
                    reject(dbErr);
                }
            });
        });
    }

    async restoreBackup(backupId) {
        const res = await pool.query("SELECT * FROM system_backups WHERE id = $1", [backupId]);
        if (res.rows.length === 0) throw new Error("Backup not found.");
        const backup = res.rows[0];

        return new Promise((resolve, reject) => {
            const isDocker = process.env.DB_HOST === 'db';
            let command = '';

            if (isDocker) {
                command = `pg_restore -h db -U ${process.env.DB_USER} -d ${process.env.DB_DATABASE} -c --if-exists "${backup.file_path}"`;
            } else {
                const pgRestorePath = process.env.PG_BIN_PATH ? path.join(process.env.PG_BIN_PATH, 'pg_restore') : 'pg_restore';
                command = `"${pgRestorePath}" -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -p ${process.env.DB_PORT || 5432} -d ${process.env.DB_DATABASE} -c --if-exists "${backup.file_path}"`;
            }

            console.log(`🔄 Restoring backup: ${backup.backup_name}`);
            exec(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASS || process.env.DB_PASSWORD } }, (error) => {
                if (error) {
                    console.error(`❌ Restore failed: ${error.message}`);
                    return reject(error);
                }
                console.log(`✅ Restore complete.`);
                resolve({ success: true, message: "System restored successfully." });
            });
        });
    }
}

module.exports = new BackupService();
