const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

class FileController {
    async uploadFile(req, res) {
        try {
            const { table, id } = req.params;
            if (!req.file) throw new Error("No file uploaded.");

            const fileName = req.file.filename;
            const originalName = req.file.originalname;
            const filePath = req.file.path;

            await pool.query(
                "INSERT INTO attachments (target_table, target_id, file_name, original_name, file_path) VALUES ($1, $2, $3, $4, $5)",
                [table, id, fileName, originalName, filePath]
            );

            res.json({ success: true, fileName });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async getAttachments(req, res) {
        try {
            const { table, id } = req.params;
            const result = await pool.query("SELECT * FROM attachments WHERE target_table = $1 AND target_id = $2", [table, id]);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async deleteAttachment(req, res) {
        try {
            const { id } = req.params;
            const fileRes = await pool.query("SELECT file_path FROM attachments WHERE id = $1", [id]);
            if (fileRes.rows.length > 0) {
                const filePath = fileRes.rows[0].file_path;
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            await pool.query("DELETE FROM attachments WHERE id = $1", [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new FileController();
