const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middlewares/auth');

// Get User Preferences
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_preferences WHERE user_id = $1', [req.user.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // Default preferences if not set
            res.json({ language: 'en', theme_mode: 'light', sidebar_collapsed: false });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch preferences" });
    }
});

// Save/Update User Preferences
router.post('/preferences', authenticateToken, async (req, res) => {
    const { language, theme_mode, date_format, sidebar_collapsed, dashboard_layout } = req.body;
    try {
        await pool.query(`
            INSERT INTO user_preferences (user_id, language, theme_mode, date_format, sidebar_collapsed, dashboard_layout, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                language = EXCLUDED.language,
                theme_mode = EXCLUDED.theme_mode,
                date_format = EXCLUDED.date_format,
                sidebar_collapsed = EXCLUDED.sidebar_collapsed,
                dashboard_layout = EXCLUDED.dashboard_layout,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, language, theme_mode, date_format, sidebar_collapsed, dashboard_layout]);
        
        res.json({ success: true, message: "Preferences saved successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save preferences" });
    }
});

// Get User Notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

// Mark Notification as Read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update notification" });
    }
});

module.exports = router;
