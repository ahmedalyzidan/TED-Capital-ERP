const jwt = require('jsonwebtoken');

// 1. دالة فحص وقراءة التوكن الأساسية 
const authenticateToken = (req, res, next) => {
    // 🚀 التعديل 1: تجاوز مسارات الدخول، التجديد، والخروج من الفحص
    if (['/login', '/api/login', '/refresh', '/api/refresh', '/logout', '/api/logout'].includes(req.path)) return next();
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided. Please login." });
    
    jwt.verify(token, process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2', (err, user) => {
        // 🚀 التعديل 2: إرسال الكود المخصص ليلتقطه الـ Interceptor الأمامي لعمل التجديد الصامت
        if (err) {
            return res.status(401).json({ error: "TokenExpiredError", message: "Token expired" });
        }
        
        // فك تشفير الصلاحيات بشكل آمن وضمان أنها كائن (Object) دائماً
        let parsedPermissions = {};
        if (user.permissions) {
            if (typeof user.permissions === 'string') {
                try { parsedPermissions = JSON.parse(user.permissions); } catch(e) { parsedPermissions = {}; }
            } else if (typeof user.permissions === 'object') {
                parsedPermissions = user.permissions;
            }
        }
        user.permissions = parsedPermissions;
        
        req.user = user;
        next();
    });
};

// 2. دالة فحص صلاحيات الجداول 
function hasAccess(user, table, action = 'read') {
    if (user.role && user.role.toLowerCase() === 'admin') return true;
    
    if (user.permissions && user.permissions.tables) {
        if (user.permissions.tables['ALL']) return true; 
        if (user.permissions.tables[table] && user.permissions.tables[table].includes(action)) {
            return true;
        }
        if (user.role && user.role.toLowerCase() === 'custom') return false; 
    }

    const STATIC_PERMS = {
        'HR': ['staff', 'attendance', 'leaves', 'payroll', 'system_parameters', 'projects', 'audit_logs'],
        'Accountant': ['ledger', 'chart_of_accounts', 'ar_invoices', 'payment_receipts', 'installments', 'contracts', 'customers', 'subcontractor_invoices', 'partners', 'partner_deposits', 'partner_withdrawals', 'projects', 'system_parameters', 'property_units'],
        'Engineer': ['projects', 'boq', 'subcontractors', 'subcontractor_items', 'tasks', 'daily_reports', 'inventory', 'inventory_transfers', 'material_usage', 'returns', 'rfq', 'purchase_orders', 'system_parameters']
    };
    
    if (STATIC_PERMS[user.role] && STATIC_PERMS[user.role].includes(table)) return true;
    return false;
}

// 3. دالة فحص رتبة الإدارة (مع كود الفحص والتشخيص)
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ error: "Access Denied. User not authenticated." });
    }

    // الفحص الحقيقي والذكي للرتبة
    if (req.user.role && req.user.role.toLowerCase() === 'admin') {
        return next();
    }
    
    // الفحص الذكي لصلاحية إدارة المستخدمين
    if (req.user.permissions && req.user.permissions.functions) {
        const funcs = req.user.permissions.functions;
        if (funcs.includes('manage_users') || funcs.includes('ALL')) {
            return next();
        }
    }
    
    return res.status(403).json({ error: `Server Blocked: Your role is '${req.user.role}' and you lack 'manage_users' permission.` });
};

// 4. تصدير الدوال ليتمكن الخادم من قراءتها 
module.exports = { authenticateToken, hasAccess, requireAdmin };