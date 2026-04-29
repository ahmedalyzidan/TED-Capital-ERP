const express = require('express');
const pool = require('../config/db');
const { logAudit, getPgExe, getDbUrl } = require('../utils/helpers');
const { setupAutoBackup } = require('../services/cron');
const { requireAdmin } = require('../middlewares/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/parameters', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM system_parameters ORDER BY category, id");
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/parameters', requireAdmin, async (req, res) => {
    const { category, value } = req.body;
    try {
        await pool.query(
            `INSERT INTO system_parameters (category, value) VALUES ($1, $2)
             ON CONFLICT (category) DO UPDATE SET value = EXCLUDED.value`, 
            [category, value]
        );
        if (category.startsWith('Backup')) setupAutoBackup();
        await logAudit(req.user.username, 'CREATE', 'system_parameters', null, `Added/Updated ${category}: ${value}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/parameters/:id', requireAdmin, async (req, res) => {
    try {
        const row = await pool.query("SELECT * FROM system_parameters WHERE id = $1", [req.params.id]);
        await pool.query("DELETE FROM system_parameters WHERE id=$1", [req.params.id]);
        if (row.rows.length > 0 && row.rows[0].category.startsWith('Backup')) setupAutoBackup();
        await logAudit(req.user.username, 'DELETE', 'system_parameters', req.params.id, 'Deleted parameter');
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/backup', requireAdmin, async (req, res) => {
    try {
        const resParam = await pool.query("SELECT value FROM system_parameters WHERE category = 'BackupPath'");
        let bPath = path.join(__dirname, '../../uploads');
        if (resParam.rows.length > 0 && resParam.rows[0].value) bPath = resParam.rows[0].value;
        if (!fs.existsSync(bPath)) fs.mkdirSync(bPath, { recursive: true });

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `manual_backup_${dateStr}_${Date.now()}.backup`;
        const filePath = path.join(bPath, fileName);
        
        // استخدام الدالة المساعدة ليعمل النظام على Windows و Linux بسلاسة
        const cmd = `${getPgExe('pg_dump')} --dbname="${getDbUrl()}" -F c -f "${filePath}"`;

        exec(cmd, async (error, stdout, stderr) => {
            if (error) return res.status(500).json({ error: `Backup Failed: ${error.message}` });
            await pool.query("INSERT INTO backups_log (name, size, source) VALUES ($1, 'Unknown', 'Manual')", [fileName]);
            await logAudit(req.user.username, 'BACKUP', 'system', null, `Manual backup created: ${fileName}`);
            res.json({ success: true, message: `Backup created successfully at ${filePath}` });
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;