const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const pool = require('../config/db');

// Get Current HCM Profile (Self)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, u.email, u.role 
            FROM staff s
            JOIN users u ON LOWER(u.username) = LOWER(s.name)
            WHERE u.id = $1
        `, [req.user.id]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            // Fallback: return basic user info if not in staff table
            res.json({ 
                success: true, 
                data: { 
                    name: req.user.username, 
                    role: req.user.role,
                    is_profile_incomplete: true 
                } 
            });
        }
    } catch (err) {
        console.error("HCM Profile Error:", err.message);
        res.status(500).json({ error: "Failed to fetch HCM profile" });
    }
});

module.exports = router;
