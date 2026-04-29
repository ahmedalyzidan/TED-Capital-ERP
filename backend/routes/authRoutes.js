const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { logAudit } = require('../utils/helpers');

// استدعاء دالة قراءة التوكن ودالة فحص المدير معاً
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2';

// دالة توليد توكن قصير الأمد (يعيش 15 دقيقة فقط)
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role, permissions: user.permissions || {} }, 
        JWT_SECRET, 
        { expiresIn: '15m' } 
    );
};

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE username = $1 AND status = 'Active'", [username]);
        if (userRes.rows.length === 0) return res.status(401).json({ success: false, error: "Invalid credentials or inactive account." });
        
        const user = userRes.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) return res.status(401).json({ success: false, error: "Invalid credentials." });
        
        const accessToken = generateAccessToken(user);
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 أيام

        await pool.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, refreshToken, expiresAt]);
        await logAudit(user.username, 'LOGIN', 'users', user.id, 'User logged into the system.');
        
        res.json({ 
            success: true, 
            token: accessToken, 
            refreshToken: refreshToken,
            user: { id: user.id, username: user.username, email: user.email, role: user.role, permissions: user.permissions || {} } 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Internal server error during login." });
    }
});

// مسار التجديد الصامت للتوكن
router.post('/refresh', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "Refresh token required" });
    try {
        const rtRes = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()", [token]);
        if (rtRes.rows.length === 0) return res.status(403).json({ error: "Invalid or expired session" });
        
        const userId = rtRes.rows[0].user_id;
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1 AND status = 'Active'", [userId]);
        if (userRes.rows.length === 0) return res.status(403).json({ error: "User inactive or blocked" });
        
        const user = userRes.rows[0];
        const newAccessToken = generateAccessToken(user);
        
        res.json({ success: true, token: newAccessToken, user: { id: user.id, username: user.username, email: user.email, role: user.role, permissions: user.permissions || {} } });
    } catch (e) { res.status(500).json({ error: "Server error during refresh" }); }
});

// مسار الخروج
router.post('/logout', async (req, res) => {
    const { token } = req.body;
    try {
        if (token) await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Logout error" }); }
});

// طرد فوري للمستخدم (مسح جميع جلساته)
router.post('/users/:id/revoke', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [req.params.id]);
        await logAudit(req.user.username, 'REVOKE_SESSION', 'users', req.params.id, `Revoked all active sessions for User ID ${req.params.id}`);
        res.json({ success: true, message: "User sessions revoked instantly." });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, username, email, role, status, 
            COALESCE(permissions, '{}'::jsonb) as permissions, 
            created_at 
            FROM users 
            ORDER BY id DESC
        `);
        res.json({ data: result.rows });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, email, password, role, status, permissions } = req.body;
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const targetRole = role ? role.toLowerCase() : '';
    
    if (userRole !== 'admin' && targetRole === 'admin') {
        return res.status(403).json({ error: "Privilege Escalation Blocked: Only Admin can create Admin." });
    }

    try {
        const hash = await bcrypt.hash(password || '123456', 10);
        await pool.query("INSERT INTO users (username, email, password_hash, role, status, permissions) VALUES ($1, $2, $3, $4, $5, $6)", [username, email, hash, role, status, JSON.stringify(permissions || {})]);
        await logAudit(req.user.username, 'CREATE_USER', 'users', null, `Created user ${username}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { username, email, password, role, status, permissions } = req.body;
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const targetRole = role ? role.toLowerCase() : '';
    
    if (userRole !== 'admin' && targetRole === 'admin') {
        return res.status(403).json({ error: "Privilege Escalation Blocked: Only Admin can grant Admin role." });
    }

    try {
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4, status=$5, permissions=$6 WHERE id=$7", [username, email, hash, role, status, JSON.stringify(permissions || {}), req.params.id]);
        } else {
            await pool.query("UPDATE users SET username=$1, email=$2, role=$3, status=$4, permissions=$5 WHERE id=$6", [username, email, role, status, JSON.stringify(permissions || {}), req.params.id]);
        }
        
        // مسح جلسات المستخدم ليقوم المتصفح بطلب توكن جديد بالصلاحيات المحدثة
        await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [req.params.id]);
        
        await logAudit(req.user.username, 'UPDATE_USER', 'users', req.params.id, `Updated user ${username}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userCheck = await pool.query("SELECT username FROM users WHERE id=$1", [req.params.id]);
        if (userCheck.rows.length > 0 && userCheck.rows[0].username.toLowerCase() === 'admin') {
            return res.status(403).json({ error: "Critical Block: Cannot delete the primary Admin account." });
        }

        await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
        await logAudit(req.user.username, 'DELETE_USER', 'users', req.params.id, `Deleted user ID ${req.params.id}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;