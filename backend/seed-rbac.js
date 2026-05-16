const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const resources = ['USERS', 'SALES', 'HR', 'INVENTORY', 'FINANCE', 'PROJECTS', 'CLIENTS', 'REPORTS'];
const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

async function seedRBAC() {
    try {
        console.log("🌱 Seeding Enterprise RBAC...");

        // 1. Create Permissions
        for (const resource of resources) {
            for (const action of actions) {
                const code = `${resource}_${action}`;
                const name = `${action} ${resource}`;
                await pool.query(`
                    INSERT INTO permissions (resource, action, code, name, module)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (code) DO UPDATE SET 
                        resource = EXCLUDED.resource, 
                        action = EXCLUDED.action,
                        name = EXCLUDED.name
                `, [resource, action, code, name, resource.charAt(0) + resource.slice(1).toLowerCase()]);
            }
        }
        console.log(`✅ Created ${resources.length * actions.length} granular permissions.`);

        // 2. Create Super Admin Role
        const roleRes = await pool.query(`
            INSERT INTO roles (name, description, is_system_role)
            VALUES ('Super Admin', 'Full system access with all permissions bypass.', TRUE)
            ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_system_role = TRUE
            RETURNING id
        `);
        const superAdminRoleId = roleRes.rows[0].id;
        console.log("✅ Super Admin role established.");

        // 3. Assign all permissions to Super Admin (optional but good for visibility)
        const allPerms = await pool.query("SELECT id FROM permissions");
        for (const perm of allPerms.rows) {
            await pool.query(`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2) ON CONFLICT DO NOTHING
            `, [superAdminRoleId, perm.id]);
        }

        // 4. Create Default Admin User
        const adminEmail = 'admin@ted-erp.local';
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const userRes = await pool.query(`
            INSERT INTO users (username, email, password_hash, role, status, full_name)
            VALUES ('admin', $1, $2, 'Super Admin', 'Active', 'System Administrator')
            ON CONFLICT (username) DO UPDATE SET 
                role = 'Super Admin',
                email = EXCLUDED.email
            RETURNING id
        `, [adminEmail, hashedPassword]);
        const adminUserId = userRes.rows[0].id;

        // 5. Link User to Super Admin Role
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [adminUserId, superAdminRoleId]);

        console.log(`✅ Default Super Admin created: ${adminEmail} / admin123`);
        console.log("🚀 RBAC Initialization Complete.");
    } catch (err) {
        console.error("❌ RBAC Seeding failed:", err.message);
    } finally {
        process.exit();
    }
}

seedRBAC();
