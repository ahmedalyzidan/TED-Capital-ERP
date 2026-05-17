const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { validatePasswordStrength, logAudit, logSecurityEvent } = require('../utils/helpers');

/**
 * Enterprise IAM Controller
 */

// 1. Get Security Metadata (For Dynamic UI)
const getSecurityMetadata = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: No user found in request." });
        }

        const userId = parseInt(req.user.id || req.user.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid User ID." });
        }

        const currentUsername = req.user?.username || 'Unknown';
        console.log(`🛡️ [IAM] Fetching security metadata for user ${userId} (${currentUsername})`);
        
        // Fetch User Permissions (Resource:Action format)
        const permRes = await pool.query(`
            SELECT DISTINCT p.resource, p.action, p.code 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
        `, [userId]);

        // Fetch User Roles
        const roleRes = await pool.query(`
            SELECT r.id, r.name, r.is_system_role
            FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
        `, [userId]);
        const roleIds = roleRes.rows.map(r => r.id);

        // Fetch Granular Security Matrix (Elite RBAC)
        let matrixCodes = [];
        if (roleIds.length > 0) {
            const matrixRes = await pool.query(`
                SELECT module_name, action_name 
                FROM elite_security_matrix 
                WHERE role_id = ANY($1) AND is_allowed = TRUE
            `, [roleIds]);
            matrixCodes = matrixRes.rows.map(m => `${m.module_name.toUpperCase()}_${m.action_name.toUpperCase()}`);
        }

        // 3. Super Admin Logic (Explicitly Hardcoded for 'admin' user)
        const userBasicRes = await pool.query("SELECT role, is_superadmin FROM users WHERE id = $1", [userId]);
        const dbRole = (userBasicRes.rows[0]?.role || '').toLowerCase().trim();
        const isDbSuper = userBasicRes.rows[0]?.is_superadmin === true;
        const normalizedUsername = currentUsername.toLowerCase().trim();

        const isAdminRole = ['admin', 'super admin', 'superadmin', 'system admin', 'systemadmin'].includes(dbRole) ||
                           roleRes.rows.some(r => r.name && (r.is_system_role || ['admin', 'super admin', 'superadmin', 'system admin', 'systemadmin'].includes(r.name.toLowerCase().trim())));
        
        const isSuperAdmin = 
            normalizedUsername === 'admin' || 
            req.user.isSuperAdmin === true ||
            isDbSuper ||
            isAdminRole;
        
        console.log(`🛡️ [IAM] User ${currentUsername} - Matrix Permissions: ${matrixCodes.length}`);

        res.json({
            permissions: [...permRes.rows.map(p => p.code), ...matrixCodes], 
            fullPermissions: permRes.rows.map(p => ({ resource: p.resource, action: p.action, code: p.code })),
            flattenedPermissions: permRes.rows.map(p => `${p.resource}:${p.action}`),
            roles: roleRes.rows.map(r => r.name),
            orgUnits: [], 
            isSuperAdmin: isSuperAdmin
        });
    } catch (err) {
        console.error("❌ IAM Metadata Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const createRole = async (req, res) => {
    try {
        const { name, description, permissionCodes } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const roleRes = await client.query(
                "INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id",
                [name, description]
            );
            const roleId = roleRes.rows[0].id;

            if (permissionCodes && permissionCodes.length > 0) {
                const pIds = await client.query(
                    "SELECT id FROM permissions WHERE code = ANY($1)",
                    [permissionCodes]
                );
                for (const p of pIds.rows) {
                    await client.query(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)",
                        [roleId, p.id]
                    );
                }
            }
            await client.query('COMMIT');
            res.json({ success: true, roleId });
        } catch (e) { await client.query('ROLLBACK'); throw e; }
        finally { client.release(); }
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getIAMStats = async (req, res) => {
    try {
        const uCount = await pool.query("SELECT COUNT(*) FROM users");
        const rCount = await pool.query("SELECT COUNT(*) FROM roles");
        const pCount = await pool.query("SELECT COUNT(*) FROM permissions");
        const aCount = await pool.query("SELECT COUNT(*) FROM security_audit_trail");
        res.json({
            users: uCount.rows[0].count,
            roles: rCount.rows[0].count,
            permissions: pCount.rows[0].count,
            auditLogs: aCount.rows[0].count
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getSecurityAuditTrail = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM security_audit_trail ORDER BY created_at DESC LIMIT 500");
        res.json({ data: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const terminateUserSessions = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        await pool.query(
            "UPDATE active_sessions SET is_valid = FALSE WHERE user_id = $1",
            [targetUserId]
        );
        res.json({ message: `All sessions for user ${targetUserId} have been terminated.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAllRoles = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM roles ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAllPermissions = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM permissions ORDER BY module, name ASC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateRolePermissions = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { roleId, permissionIds } = req.body;
        
        await client.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
        
        for (const pId of permissionIds) {
            await client.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)",
                [roleId, pId]
            );
        }
        
        await client.query('COMMIT');
        await logAudit(req.user.username, 'UPDATE_ROLE_PERMISSIONS', 'role_permissions', roleId, `Updated permissions for role ID ${roleId}`);
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
};

const assignUserToRole = async (req, res) => {
    try {
        const { userId, roleId } = req.body;
        await pool.query(
            "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [userId, roleId]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const createUser = async (req, res) => {
    console.log("👤 IAM: Attempting to create user:", req.body.username);
        const { username, email, password, role, full_name, phone, department, employee_id, linked_employee_id, linked_company, linked_project, two_factor, permissions } = req.body;
        try {
            const passwordError = validatePasswordStrength(password);
            if (passwordError) return res.status(400).json({ error: passwordError });

            const hash = await bcrypt.hash(password || '123456', 10);
            const userRes = await pool.query(
                `INSERT INTO users (username, email, password_hash, role, status, full_name, phone, department, employee_id, linked_employee_id, linked_company, linked_project, two_factor, permissions, must_change_password) 
                 VALUES ($1, $2, $3, $4, 'Active', $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE) RETURNING id`,
                [username, email, hash, role, full_name, phone, department, employee_id, linked_employee_id, linked_company, linked_project, two_factor, JSON.stringify(permissions || {})]
            );
        const userId = userRes.rows[0].id;
        
        // Also assign to role in user_roles table if a specific role is selected
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1", [role]);
        if (roleRes.rows.length > 0) {
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [userId, roleRes.rows[0].id]);
        }

        await logAudit(req.user.username, 'CREATE_USER', 'users', userId, `Created new user: ${username} with role: ${role}`);
        await logSecurityEvent(req.user.username, 'ACCOUNT_CREATED', `User:${username}`, 'MEDIUM', `Admin created a new user account with role ${role}`);
        res.json({ success: true, userId });
    } catch (err) {
        console.error("❌ [IAM] createUser Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, role, status, full_name, phone, department, employee_id, linked_employee_id, linked_company, linked_project, two_factor, permissions } = req.body;

        // Protection for hardcoded 'admin' user
        const checkRes = await pool.query("SELECT username FROM users WHERE id = $1", [id]);
        const existingUsername = (checkRes.rows[0]?.username || '').toLowerCase().trim();
        if (existingUsername === 'admin') {
            return res.status(403).json({ error: "The root 'admin' user is protected and cannot be modified or re-assigned." });
        }
        
        if (password) {
            const passwordError = validatePasswordStrength(password);
            if (passwordError) return res.status(400).json({ error: passwordError });
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                `UPDATE users SET username = $1, email = $2, password_hash = $3, role = $4, status = $5, full_name = $6, phone = $7, 
                 department = $8, employee_id = $9, linked_employee_id = $10, linked_company = $11, linked_project = $12, two_factor = $13, permissions = $14, must_change_password = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $15`,
                [username, email, hash, role, status, full_name, phone, department, employee_id, linked_employee_id, linked_company, linked_project, two_factor, JSON.stringify(permissions || {}), id]
            );
        } else {
            await pool.query(
                `UPDATE users SET username = $1, email = $2, role = $3, status = $4, full_name = $5, phone = $6, 
                 department = $7, employee_id = $8, linked_employee_id = $9, linked_company = $10, linked_project = $11, two_factor = $12, permissions = $13, updated_at = CURRENT_TIMESTAMP WHERE id = $14`,
                [username, email, role, status, full_name, phone, department, employee_id, linked_employee_id, linked_company, linked_project, two_factor, JSON.stringify(permissions || {}), id]
            );
        }

        // Update role mapping in user_roles table
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1", [role]);
        if (roleRes.rows.length > 0) {
            const roleId = roleRes.rows[0].id;
            await pool.query("DELETE FROM user_roles WHERE user_id = $1", [id]);
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [id, roleId]);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getOrgUnits = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM org_units ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT permission_id FROM role_permissions WHERE role_id = $1",
            [id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { 
    getSecurityMetadata, 
    createRole, 
    terminateUserSessions, 
    getAllRoles, 
    getAllPermissions, 
    updateRolePermissions,
    assignUserToRole,
    getOrgUnits,
    getRolePermissions,
    createUser,
    updateUser,
    getIAMStats,
    getSecurityAuditTrail
};
