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
            const filePath = req.file.location || `/uploads/${req.file.filename}`;

            await pool.query(
                "INSERT INTO attachments (table_name, record_id, file_name, original_name, file_path, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)",
                [table, id, fileName, originalName, filePath, req.user ? req.user.username : 'System']
            );

            res.json({ success: true, fileName, url: filePath });
        } catch (err) {
            console.error("🔥 Upload File Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    async getAttachments(req, res) {
        try {
            const { table, id } = req.params;
            const result = await pool.query("SELECT * FROM attachments WHERE table_name = $1 AND record_id = $2 ORDER BY id DESC", [table, id]);
            res.json(result.rows);
        } catch (err) {
            console.error("🔥 Get Attachments Error:", err);
            res.status(500).json({ error: err.message });
        }
    }

    async deleteAttachment(req, res) {
        try {
            const { id } = req.params;
            const fileRes = await pool.query("SELECT file_path, file_name FROM attachments WHERE id = $1", [id]);
            if (fileRes.rows.length > 0) {
                let filePath = fileRes.rows[0].file_path;
                if (filePath && filePath.startsWith('/uploads')) {
                    const actualFileName = fileRes.rows[0].file_name;
                    const localDiskPath = path.join(__dirname, '../../uploads', actualFileName);
                    if (fs.existsSync(localDiskPath)) fs.unlinkSync(localDiskPath);
                } else if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            await pool.query("DELETE FROM attachments WHERE id = $1", [id]);
            res.json({ success: true });
        } catch (err) {
            console.error("🔥 Delete Attachment Error:", err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new FileController();
