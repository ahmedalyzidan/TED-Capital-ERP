const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { logAudit, logSecurityEvent, validatePasswordStrength } = require('../utils/helpers');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { authGuard } = require('../middlewares/authMiddleware');
const iamController = require('../controllers/iamController');

// 🌟 مكتبات المصادقة الثنائية (تأكد من تشغيل: npm install speakeasy qrcode)
let speakeasy, qrcode;
try {
    speakeasy = require('speakeasy');
    qrcode = require('qrcode');
} catch(e) {
    console.warn("⚠️ Warning: speakeasy or qrcode is not installed. 2FA features will fail.");
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2';

// 🌟 Public Health Check (No Auth Required)
router.get('/health', (req, res) => res.json({ status: 'UP', timestamp: new Date() }));
router.get('/iam/stats', authGuard, iamController.getIAMStats);
router.get('/iam/metadata', authGuard, iamController.getSecurityMetadata);
router.get('/iam/audit-trail', authGuard, requireAdmin, iamController.getSecurityAuditTrail);

// 🌟 تحديث الهيكل آلياً لإضافة حقول المصادقة الثنائية
(async () => {
    try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE");
    } catch(e) { console.error("2FA DDL Schema Error:", e.message); }
})();

// دالة توليد التوكن (تدعم نوعين: توكن جزئي للـ 2FA، وتوكن كامل)
const generateAccessToken = (user, isPartial = false) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            permissions: user.permissions || {},
            is2FAEnabled: user.is_2fa_enabled,
            isPartial2FA: isPartial // 🌟 علامة توضح أن المستخدم تجاوز الباسوورد وينتظر كود الهاتف
        }, 
        JWT_SECRET, 
        { expiresIn: isPartial ? '5m' : '12h' } 
    );
};


// 🌟 1. مسار تسجيل الدخول المُحدث (يدعم الـ 2FA)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`📥 [LOGIN REQUEST] User: ${username}, Password Length: ${password?.length}`);
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND status = 'Active'", [username]);
        if (userRes.rows.length === 0) {
            console.warn(`❌ [LOGIN FAIL] User not found or inactive: ${username}`);
            return res.status(401).json({ success: false, error: "Invalid credentials or inactive account." });
        }
        
        const user = userRes.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`🔑 [AUTH DEBUG] User: ${username}, Match: ${isMatch}, 2FA: ${user.is_2fa_enabled}`);
        
        if (!isMatch) {
            console.warn(`❌ [LOGIN FAIL] Password mismatch for: ${username}`);
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }
        
        // إذا كان المستخدم مفعل الـ 2FA، نعطيه توكن مؤقت ونطلب منه الـ OTP
        if (user.is_2fa_enabled) {
            console.log(`📱 [AUTH 2FA] User ${username} requires OTP.`);
            const partialToken = generateAccessToken(user, true);
            return res.json({
                success: true,
                requires2FA: true,
                token: partialToken,
                message: "الرجاء إدخال كود المصادقة الثنائية (OTP) المولد بهاتفك."
            });
        }
        
        const accessToken = generateAccessToken(user);
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 أيام

        await pool.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, refreshToken, expiresAt]);
        await logAudit(user.username, 'LOGIN', 'users', user.id, 'User logged into the system.');
        await logSecurityEvent(user.username, 'LOGIN_SUCCESS', 'AuthSystem', 'LOW', 'Successful login established.');
        
        const responseBody = { 
            success: true, 
            token: accessToken, 
            refreshToken: refreshToken,
            mustChangePassword: user.must_change_password,
            user: { id: user.id, username: user.username, email: user.email, role: user.role, permissions: user.permissions || {} } 
        };
        console.log(`📤 [LOGIN SUCCESS] User: ${username}, Sending token...`);
        res.json(responseBody);

    } catch (err) {
        console.error("🔥 [LOGIN ERROR]:", err);
        res.status(500).json({ success: false, error: "Internal server error during login." });
    }
});

// 🌟 2. مسار التحقق من كود الـ 2FA (OTP) لمنح التوكن النهائي
router.post('/2fa/validate', async (req, res) => {
    const { token, otp } = req.body;
    if (!token || !otp) return res.status(400).json({ error: "Token and OTP required." });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isPartial2FA) return res.status(400).json({ error: "Invalid token type." });
        
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
        const user = userRes.rows[0];
        
        // فحص الـ OTP عبر مكتبة Speakeasy
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: otp,
            window: 1 // سماحية 30 ثانية لتأخر الوقت
        });
        
        if (!verified) return res.status(401).json({ error: "الكود غير صحيح أو منتهي الصلاحية." });
        
        const accessToken = generateAccessToken(user);
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await pool.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, refreshToken, expiresAt]);
        await logAudit(user.username, 'LOGIN_2FA', 'users', user.id, 'User logged in via 2FA Code.');
        
        res.json({ 
            success: true, 
            token: accessToken, 
            refreshToken: refreshToken,
            user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions || {} } 
        });
    } catch (err) {
        res.status(401).json({ error: "Partial Token expired or invalid." });
    }
});

// 🌟 3. مسار إعداد الـ 2FA للمستخدم لأول مرة (يولد QR Code)
router.post('/2fa/setup', authenticateToken, async (req, res) => {
    if (!speakeasy || !qrcode) return res.status(500).json({ error: "2FA libraries not installed on server." });
    
    // توليد مفتاح سري
    const secret = speakeasy.generateSecret({ name: `TED ERP (${req.user.username})` });
    
    // حفظ الـ secret في قاعدة البيانات (لكن التفعيل يظل False حتى يؤكد الكود الأول)
    await pool.query("UPDATE users SET two_factor_secret = $1 WHERE id = $2", [secret.base32, req.user.id]);
    
    // توليد صورة الـ QR لبرنامج Google Authenticator
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return res.status(500).json({ error: "QR Code generation failed." });
        res.json({ secret: secret.base32, qrCode: data_url });
    });
});

// 🌟 4. مسار تأكيد كود الـ 2FA وتفعيله بشكل نهائي
router.post('/2fa/enable', authenticateToken, async (req, res) => {
    const { otp } = req.body;
    const userRes = await pool.query("SELECT two_factor_secret FROM users WHERE id = $1", [req.user.id]);
    const secret = userRes.rows[0].two_factor_secret;
    
    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: otp,
        window: 1
    });
    
    if (verified) {
        await pool.query("UPDATE users SET is_2fa_enabled = TRUE WHERE id = $1", [req.user.id]);
        await logAudit(req.user.username, 'ENABLE_2FA', 'users', req.user.id, '2FA Enabled successfully.');
        res.json({ success: true, message: "تم تفعيل المصادقة الثنائية بنجاح." });
    } else {
        res.status(400).json({ error: "الكود غير صحيح." });
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
        await logSecurityEvent(req.user.username, 'SESSION_REVOKED', `User:${req.params.id}`, 'HIGH', `Admin revoked all sessions for User ID ${req.params.id}`);
        res.json({ success: true, message: "User sessions revoked instantly." });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, username, email, role, status, is_2fa_enabled,
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
        const passwordError = validatePasswordStrength(password);
        if (passwordError) return res.status(400).json({ error: passwordError });

        const hash = await bcrypt.hash(password || '123456', 10);
        await pool.query("INSERT INTO users (username, email, password_hash, role, status, permissions, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, TRUE)", [username, email, hash, role, status, JSON.stringify(permissions || {})]);
        await logAudit(req.user.username, 'CREATE_USER', 'users', null, `Created user ${username}`);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 🌟 مسار تغيير كلمة المرور الإجباري أو الاختياري
router.post('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
        const user = userRes.rows[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة." });

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) return res.status(400).json({ error: passwordError });

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash = $1, must_change_password = FALSE, last_password_change = CURRENT_TIMESTAMP WHERE id = $2", [hash, req.user.id]);
        
        await logAudit(user.username, 'CHANGE_PASSWORD', 'users', user.id, 'User changed their password.');
        res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
            const passwordError = validatePasswordStrength(password);
            if (passwordError) return res.status(400).json({ error: passwordError });
            const hash = await bcrypt.hash(password, 10);
            await pool.query("UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4, status=$5, permissions=$6, must_change_password=TRUE WHERE id=$7", [username, email, hash, role, status, JSON.stringify(permissions || {}), req.params.id]);
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