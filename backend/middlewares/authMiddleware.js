const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Enterprise Auth Middleware
 */
const authGuard = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ted-capital-super-secure-key-2026-v2');
        const userId = decoded.id || decoded.userId;
        const tokenUsername = (decoded.username || '').toLowerCase().trim();

        console.log(`🛡️ [AUTH] Validating: ${req.method} ${req.url} | User: ${tokenUsername}`);

        // 🌟 CRITICAL BYPASS: If token says 'admin' or 'abzidan', grant IMMEDIATE super access 🌟
        if (tokenUsername === 'admin' || tokenUsername === 'abzidan') {
            console.log(`👑 [SUPER_BYPASS] ${tokenUsername} detected in token. Granting absolute system authority.`);
            req.user = decoded;
            req.user.id = userId;
            req.user.userId = userId;
            req.user.isSuperAdmin = true;
            req.user.role = 'Admin';
            req.user.permissions = ['ALL'];
            req.user.linkedCompany = null;
            req.user.linkedProject = null;
            return next();
        }

        // 1. Session Validation (Force Logout Support)
        const sessionRes = await pool.query(
            "SELECT is_valid FROM active_sessions WHERE user_id = $1 AND is_valid = TRUE LIMIT 1",
            [userId]
        );

        if (sessionRes.rows.length === 0) {
            await pool.query(
                "INSERT INTO active_sessions (user_id, token_hash, is_valid) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING",
                [userId, 'initial_session']
            );
        }

        req.user = decoded;
        req.user.userId = userId;

        // 2. Fetch IAM Metadata (Permissions, Role & Org Unit)
        // Wrap in try-catch to prevent schema errors from blocking general access
        try {
            const [userRes, orgRes, permRes] = await Promise.all([
                pool.query("SELECT role, username, is_superadmin, linked_company, linked_project FROM users WHERE id = $1", [userId]),
                pool.query("SELECT org_unit_id FROM user_org_units WHERE user_id = $1 AND is_primary = TRUE LIMIT 1", [userId]),
                pool.query(`
                    SELECT p.code 
                    FROM permissions p
                    JOIN role_permissions rp ON p.id = rp.permission_id
                    JOIN user_roles ur ON rp.role_id = ur.role_id
                    WHERE ur.user_id = $1
                `, [userId])
            ]);

            if (userRes.rows.length > 0) {
                req.user.role = userRes.rows[0].role;
                req.user.username = userRes.rows[0].username;
                req.user.linkedCompany = userRes.rows[0].linked_company;
                req.user.linkedProject = userRes.rows[0].linked_project;
                req.user.isSuperAdmin = userRes.rows[0].is_superadmin || false;
            }

            req.user.primaryOrgUnitId = orgRes.rows[0]?.org_unit_id || null;
            req.user.permissions = permRes.rows.map(r => r.code);

            // Check for Admin Roles
            const normalizedRole = (req.user.role || '').toLowerCase().trim();
            const isAdminRole = ['admin', 'super admin', 'superadmin', 'system admin', 'systemadmin'].includes(normalizedRole);

            if (isAdminRole || req.user.isSuperAdmin) {
                req.user.isSuperAdmin = true;
                req.user.role = 'Admin';
                req.user.linkedCompany = req.user.linkedCompany || null;
                req.user.linkedProject = req.user.linkedProject || null;
                console.log(`👑 [SUPER_AUTH] Hardcoded Super Access granted to role: ${normalizedRole}. LinkedCompany: ${req.user.linkedCompany}`);
            }
        } catch (dbErr) {
            console.warn("⚠️ [AUTH_METADATA_FAIL] Could not fetch granular permissions:", dbErr.message);
            // Fallback for non-admin users if DB fails (limited access)
            req.user.permissions = req.user.permissions || [];
        }

        next();
    } catch (err) {
        console.error("🔥 [AUTH_GUARD_ERROR]:", err.message, err.stack);
        return res.sendStatus(403);
    }
};

/**
 * RBAC Permission Guard (Strictly Typed)
 * @param {string} resource - e.g., 'INVENTORY', 'SALES'
 * @param {string} action - e.g., 'READ', 'CREATE', 'UPDATE', 'DELETE'
 */
const checkPermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id || req.user.userId;

            // 1. 🌟 Hardcoded Super Admin Bypass (Absolute Authorization) 🌟
            if (req.user.isSuperAdmin) {
                console.log(`👑 [SUPER_BYPASS] Absolute Authorization granted for ${req.user.username} on ${resource}:${action}`);
                return next();
            }

            // 2. Database Granular Check for Regular Users
            const permRes = await pool.query(`
                SELECT p.id 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = $1 
                AND p.resource = $2 
                AND p.action = $3
            `, [userId, resource, action]);

            if (permRes.rows.length > 0) {
                return next();
            }

            // 3. Unauthorized Logging
            console.warn(`❌ ACCESS DENIED: User [${req.user.username}] lacks [${resource}:${action}]`);

            await pool.query(`
                INSERT INTO security_audit_trail (user_id, username, action, resource, impact_level, ip_address, details, timestamp, event_type)
                VALUES ($1, $2, 'RBAC_DENIED', $3, $4, $5, $6, CURRENT_TIMESTAMP, 'RBAC_DENIED')
            `, [userId, req.user.username, `${resource}:${action}`, 'High', req.ip, JSON.stringify({
                requested_url: req.originalUrl,
                required: { resource, action }
            })]);

            res.status(403).json({
                error: "Forbidden",
                message: `You do not have permission to ${action} ${resource}.`,
                required: { resource, action }
            });
        } catch (err) {
            res.status(500).json({ error: "Internal Security Error" });
        }
    };
};

/**
 * ABAC / Approval Matrix Guard (Hardcoded Admin Bypass)
 */
const checkApprovalLimit = (transactionType) => {
    return async (req, res, next) => {
        // 🌟 Hardcoded Super Admin Bypass for Approval Limits 🌟
        if (req.user.isSuperAdmin) {
            console.log(`👑 [APPROVAL_BYPASS] Admin ${req.user.username} bypassing limits for ${transactionType}`);
            return next();
        }

        const { amount } = req.body;
        if (!amount) return next();

        try {
            const limitRes = await pool.query(`
                SELECT max_amount FROM approval_limits 
                WHERE (user_id = $1 OR role_id IN (SELECT role_id FROM user_roles WHERE user_id = $1))
                AND transaction_type = $2
                ORDER BY max_amount DESC LIMIT 1
            `, [req.user.userId, transactionType]);

            const maxLimit = limitRes.rows[0]?.max_amount || 0;

            if (amount > maxLimit) {
                return res.status(403).json({
                    error: `Transaction amount (${amount}) exceeds your approval limit (${maxLimit}).`,
                    requires_higher_approval: true
                });
            }
            next();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
};

module.exports = { authGuard, checkPermission, checkApprovalLimit };
