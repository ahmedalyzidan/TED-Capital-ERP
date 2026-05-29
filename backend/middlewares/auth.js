const jwt = require('jsonwebtoken');

// 1. دالة فحص وقراءة التوكن الأساسية 
const authenticateToken = (req, res, next) => {
    console.log(`🔒 [AUTH] Checking: ${req.method} ${req.path}`);
    // 🚀 تجاوز مسارات الدخول، التجديد، الخروج، ومسار التحقق من الـ 2FA
    if (['/login', '/api/login', '/refresh', '/api/refresh', '/logout', '/api/logout', '/2fa/validate', '/api/2fa/validate', '/public/companies', '/api/public/companies', '/public/forgot-password', '/api/public/forgot-password', '/health', '/api/health'].includes(req.path)) {
        console.log("🔓 [AUTH] Skipping (Public Route)");
        return next();
    }
    
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
    
    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided. Please login." });
    
    jwt.verify(token, process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2', (err, user) => {
        if (err) {
            return res.status(401).json({ error: "TokenExpiredError", message: "Token expired" });
        }
        
        // 🌟 فحص أمني: إذا كان التوكن "مؤقتاً" ولم يكمل الـ 2FA، نمنع وصوله للـ API 🌟
        if (user.isPartial2FA) {
            return res.status(403).json({ error: "2FA Required", message: "Please complete Two-Factor Authentication." });
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
        user.isMtayem = (user.username || '').toUpperCase() === 'MTAYEM';
        user.isMsobhi = (user.username || '').toUpperCase() === 'MSOBHI';
        
        const selectedCompany = req.headers['x-selected-company'] || req.query.company;
        if (selectedCompany) {
            user.selectedCompany = selectedCompany;
        }
        
        req.user = user;
        next();
    });
};

// 2. دالة فحص صلاحيات الجداول 
function hasAccess(user, table, action = 'read') {
    const role = (user.role || '').toLowerCase().trim();
    const username = (user.username || '').toLowerCase().trim();

    // 🌟 Hardcoded Super Access 🌟
    if (username === 'admin' || username === 'abzidan' || ['admin', 'super admin', 'superadmin', 'system admin', 'systemadmin'].includes(role)) {
        return true;
    }

    // 🌟 Granular User-Level Matrix Check (Takes Precedence if Defined) 🌟
    if (user.permissions && user.permissions.tables && Object.keys(user.permissions.tables).length > 0) {
        if (user.permissions.tables['ALL']) return true;
        if (user.permissions.tables[table] && user.permissions.tables[table].includes(action)) {
            return true;
        }
        return false; // Explicitly restricted by user matrix!
    }

    // 🌟 Company/Project Scoped & Management User Access (Fallback if no granular matrix defined) 🌟
    if (user.linkedCompany || user.linkedProject || ['financial manager', 'general manager', 'manager', 'project manager', 'mpo_auditor'].includes(role)) {
        return true;
    }
    
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

    const role = (req.user.role || '').toLowerCase().trim();
    const username = (req.user.username || '').toLowerCase().trim();

    // 🌟 Hardcoded Super Access 🌟
    if (username === 'admin' || username === 'abzidan' || ['admin', 'super admin', 'superadmin', 'system admin', 'systemadmin'].includes(role)) {
        return next();
    }
    
    if (req.user.permissions && req.user.permissions.functions) {
        const funcs = req.user.permissions.functions;
        if (funcs.includes('manage_users') || funcs.includes('ALL')) {
            return next();
        }
    }
    
    return res.status(403).json({ error: `Server Blocked: Your role is '${req.user.role}' and you lack 'manage_users' permission.` });
};

// 🌟 4. دالة أمان جديدة (MFA) تُضاف للمسارات فائقة الحساسية (مثل تفريغ قاعدة البيانات)
const requireStrict2FA = (req, res, next) => {
    if (!req.user.is2FAEnabled) {
        return res.status(403).json({ error: "Strict Security: Please enable 2FA in your account settings to perform this action." });
    }
    next();
};

// 5. تصدير الدوال ليتمكن الخادم من قراءتها 
module.exports = { authenticateToken, hasAccess, requireAdmin, requireStrict2FA };